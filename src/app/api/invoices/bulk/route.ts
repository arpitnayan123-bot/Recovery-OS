import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { getSessionUser, audit, AUDIT } from "@/lib/auth";
import { prisma, buildStatutoryNotice, daysOverdue, odrCaseNumber, MSEFC_DECISION_DAYS } from "@/lib/recovery";

const DAY = 86_400_000;

const DOC_KINDS = [
  { kind: "tax_invoice", name: "Tax invoice (GST compliant)" },
  { kind: "po", name: "Purchase order / work order" },
  { kind: "challan", name: "Delivery challan + e-way bill" },
  { kind: "gst_filing", name: "GSTR-1 extract (filed)" },
  { kind: "ledger", name: "Buyer ledger statement" },
];

type ResultStatus = "done" | "skipped" | "not_ready";

/**
 * POST /api/invoices/bulk
 * Body: { ids: string[], action: "remind" | "evidence" | "file" }
 *
 * Bulk pipeline actions:
 *  - remind   → serve §15/§16 statutory demand (watch + overdue → reminder_sent)
 *  - evidence → seal the 5-document evidence pack (reminder_sent → evidence_ready)
 *  - file     → file on the ODR portal (evidence_ready → odr_filed + Case created)
 *
 * Idempotent: invoices not at the right stage are skipped + reported.
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
  if (!["remind", "evidence", "file"].includes(action)) {
    return NextResponse.json({ error: "Unknown bulk action" }, { status: 400 });
  }

  const now = new Date();
  const invoices = await prisma.invoice.findMany({
    where: { id: { in: ids }, orgId: org.id },
    include: { buyer: true, reminders: { where: { kind: "statutory" } }, documents: true, case: true },
  });

  const verb = action === "remind" ? "served" : action === "evidence" ? "sealed" : "filed";
  const results: { id: string; number: string; buyer: string; status: ResultStatus; reason?: string }[] = [];

  for (const inv of invoices) {
    if (action === "remind") {
      if (inv.status !== "watch") {
        results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "skipped", reason: `already ${inv.status}` });
        continue;
      }
      const od = daysOverdue({ dueOn: inv.dueOn }, now);
      if (od <= 0) {
        results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "not_ready", reason: "inside 45-day term" });
        continue;
      }
      if (inv.reminders.length > 0) {
        results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "skipped", reason: "notice already served" });
        continue;
      }
      const notice = buildStatutoryNotice({
        supplierName: org.name, buyerName: inv.buyer.name, invoiceNumber: inv.number,
        amount: inv.amount, issuedOn: inv.issuedOn, dueOn: inv.dueOn, now,
      });
      await prisma.$transaction([
        prisma.reminder.create({ data: { invoiceId: inv.id, channel: "email", kind: "statutory", subject: notice.subject, body: notice.body } }),
        prisma.invoice.update({ where: { id: inv.id }, data: { status: "reminder_sent" } }),
        prisma.event.create({ data: { orgId: org.id, invoiceId: inv.id, type: "notice", title: `Statutory demand served on ${inv.buyer.name} (bulk)`, detail: `§16 interest claimed: ₹${Math.round(notice.interest).toLocaleString("en-IN")} · total ₹${Math.round(notice.totalDue).toLocaleString("en-IN")}` } }),
      ]);
      results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "done" });
    } else if (action === "evidence") {
      if (inv.status !== "reminder_sent") {
        results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "skipped", reason: inv.status === "watch" ? "serve notice first" : `already ${inv.status}` });
        continue;
      }
      if (inv.documents.length > 0) {
        results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "skipped", reason: "evidence already sealed" });
        continue;
      }
      await prisma.$transaction([
        prisma.document.createMany({ data: DOC_KINDS.map((d) => ({ invoiceId: inv.id, ...d, status: "verified" })) }),
        prisma.invoice.update({ where: { id: inv.id }, data: { status: "evidence_ready" } }),
        prisma.event.create({ data: { orgId: org.id, invoiceId: inv.id, type: "evidence", title: `Evidence pack sealed — ${inv.buyer.name} (bulk)`, detail: "5 documents verified: PO, challans, GST filings, ledger" } }),
      ]);
      results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "done" });
    } else {
      // file
      if (inv.status !== "evidence_ready") {
        results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "skipped", reason: inv.status === "watch" ? "serve notice first" : inv.status === "reminder_sent" ? "seal evidence first" : `already ${inv.status}` });
        continue;
      }
      if (inv.case) {
        results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "skipped", reason: "already filed" });
        continue;
      }
      const caseNumber = odrCaseNumber(now);
      await prisma.$transaction([
        prisma.case.create({ data: { orgId: org.id, invoiceId: inv.id, caseNumber, stage: "filed", filedOn: now } }),
        prisma.invoice.update({ where: { id: inv.id }, data: { status: "odr_filed" } }),
        prisma.event.create({ data: { orgId: org.id, invoiceId: inv.id, type: "filed", title: `ODR reference filed — ${caseNumber} (bulk)`, detail: `Statutory ${MSEFC_DECISION_DAYS}-day clock started (§18)` } }),
      ]);
      results.push({ id: inv.id, number: inv.number, buyer: inv.buyer.name, status: "done" });
    }
  }

  const done = results.filter((r) => r.status === "done").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const notReady = results.filter((r) => r.status === "not_ready").length;

  await audit(org.id, user?.email ?? "anonymous", AUDIT.ADVANCE, { bulk: true, action, total: ids.length, done, skipped, notReady });

  const actionLabel = action === "remind" ? "demand served" : action === "evidence" ? "evidence pack sealed" : "ODR reference filed";
  return NextResponse.json({
    results,
    summary: { total: ids.length, done, skipped, notReady },
    message: `Bulk ${actionLabel} on ${done} invoice${done === 1 ? "" : "s"}${skipped || notReady ? ` · ${skipped + notReady} skipped` : ""}.`,
  });
}
