import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { prisma, daysOverdue, invoiceInterest, stageIndexOf, STAGES } from "@/lib/recovery";
import { serializeInvoice, invoiceInclude } from "@/lib/dto";

export async function GET(req: Request) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all";

  const invoices = await prisma.invoice.findMany({
    where: { orgId: org.id },
    include: { ...invoiceInclude, events: { take: 1, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  let rows = invoices.map((inv) => serializeInvoice(inv, now));

  if (filter === "watch") rows = rows.filter((r) => r.status === "watch");
  if (filter === "overdue") rows = rows.filter((r) => r.status !== "recovered" && r.daysOverdue > 0);
  if (filter === "recovery") rows = rows.filter((r) => !["watch", "recovered"].includes(r.status));
  if (filter === "recovered") rows = rows.filter((r) => r.status === "recovered");

  const pipeline = STAGES.map((s, idx) => {
    const bucket = invoices.filter((inv) => stageIndexOf(inv.status) === idx && inv.status !== "recovered");
    return {
      key: s.key,
      label: s.label,
      count: bucket.length,
      amount: bucket.reduce((sum, inv) => sum + invoiceInterest(inv.amount, inv.dueOn, now).totalDue, 0),
    };
  });

  return NextResponse.json({ invoices: rows, pipeline });
}

/** Manual invoice entry */
export async function POST(req: Request) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const buyerName = String(body?.buyer ?? "").trim();
  const number = String(body?.number ?? "").trim();
  const amount = Number(body?.amount);
  const issuedOn = body?.issuedOn ? new Date(body.issuedOn) : new Date();

  if (!buyerName || !number || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "buyer, number and a positive amount are required" }, { status: 400 });
  }
  if (Number.isNaN(issuedOn.getTime())) {
    return NextResponse.json({ error: "issuedOn is not a valid date" }, { status: 400 });
  }

  const buyer = await prisma.buyer.upsert({
    where: { orgId_name: { orgId: org.id, name: buyerName } },
    create: { orgId: org.id, name: buyerName },
    update: {},
  });

  const invoice = await prisma.invoice.create({
    data: {
      orgId: org.id,
      buyerId: buyer.id,
      number,
      amount,
      issuedOn,
      dueOn: new Date(issuedOn.getTime() + 45 * 86_400_000),
      status: "watch",
    },
  });

  const od = daysOverdue({ dueOn: invoice.dueOn });
  await prisma.event.create({
    data: { orgId: org.id, invoiceId: invoice.id, type: "sync", title: `Invoice ${number} ingested — ₹${Math.round(amount).toLocaleString("en-IN")}` },
  });
  if (od > 0) {
    await prisma.event.create({
      data: { orgId: org.id, invoiceId: invoice.id, type: "detect", title: `${buyerName} crossed day 45 — §16 interest now accruing` },
    });
  }

  const full = await prisma.invoice.findUnique({ where: { id: invoice.id }, include: { ...invoiceInclude } });
  return NextResponse.json({ invoice: full ? serializeInvoice(full) : null });
}
