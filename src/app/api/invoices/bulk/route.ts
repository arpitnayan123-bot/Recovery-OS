import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { getSessionUser, audit, AUDIT } from "@/lib/auth";
import { prisma, buildStatutoryNotice, daysOverdue } from "@/lib/recovery";

const DAY = 86_400_000;

/**
 * POST /api/invoices/bulk
 * Body: { ids: string[], action: "remind" }
 *
 * Bulk-serves statutory demand notices (§15/§16) on every selected invoice that
 * is currently in `watch` status and past its 45-day term. Idempotent: invoices
 * already past `watch` are skipped and reported. Returns per-invoice results
 * so the UI can show exactly what happened.
 */
export async function POST(req: Request) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });
  const user = await getSessionUser();

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x) => typeof x === "string") : [];
  const action = String(body?.action ?? "");

  if (ids.length === 0) {
    return NextResponse.json({ error: "Select at least one invoice" }, { status: 400 });
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: "Bulk actions are limited to 100 invoices at a time" }, { status: 400 });
  }
  if (action !== "remind") {
    return NextResponse.json({ error: "Unknown bulk action" }, { status: 400 });
  }

  const now = new Date();
  const invoices = await prisma.invoice.findMany({
    where: { id: { in: ids }, orgId: org.id },
    include: { buyer: true, reminders: { where: { kind: "statutory" } } },
  });

  const results: { id: string; number: string; buyer: string; status: "served" | "skipped" | "not_overdue"; reason?: string }[] = [];

  for (const inv of invoices) {
    if (inv.status !== "watch") {
      results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "skipped", reason: `already ${inv.status}` });
      continue;
    }
    const od = daysOverdue({ dueOn: inv.dueOn }, now);
    if (od <= 0) {
      results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "not_overdue", reason: "inside 45-day term" });
      continue;
    }
    if (inv.reminders.length > 0) {
      results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "skipped", reason: "notice already served" });
      continue;
    }

    const notice = buildStatutoryNotice({
      supplierName: org.name,
      buyerName: inv.buyer.name,
      invoiceNumber: inv.number,
      amount: inv.amount,
      issuedOn: inv.issuedOn,
      dueOn: inv.dueOn,
      now,
    });

    await prisma.$transaction([
      prisma.reminder.create({
        data: { invoiceId: inv.id, channel: "email", kind: "statutory", subject: notice.subject, body: notice.body },
      }),
      prisma.invoice.update({ where: { id: inv.id }, data: { status: "reminder_sent" } }),
      prisma.event.create({
        data: {
          orgId: org.id,
          invoiceId: inv.id,
          type: "notice",
          title: `Statutory demand served on ${inv.buyer.name} (bulk)`,
          detail: `§16 interest claimed: ₹${Math.round(notice.interest).toLocaleString("en-IN")} · total demanded ₹${Math.round(notice.totalDue).toLocaleString("en-IN")}`,
        },
      }),
    ]);
    results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "served" });
  }

  const served = results.filter((r) => r.status === "served").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const notOverdue = results.filter((r) => r.status === "not_overdue").length;

  await audit(org.id, user?.email ?? "anonymous", AUDIT.ADVANCE, { bulk: true, action, total: ids.length, served, skipped, notOverdue });

  return NextResponse.json({
    results,
    summary: { total: ids.length, served, skipped, notOverdue },
    message: `Bulk demand served on ${served} invoice${served === 1 ? "" : "s"}${skipped || notOverdue ? ` · ${skipped + notOverdue} skipped` : ""}.`,
  });
}
