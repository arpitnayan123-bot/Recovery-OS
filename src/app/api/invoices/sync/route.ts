import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { prisma, daysOverdue } from "@/lib/recovery";
import { serializeInvoice, invoiceInclude } from "@/lib/dto";

const POOL = [
  { number: "SUN/2026/2207", buyer: "Sundaram Fasteners Ltd", gstin: "33AAACS4444Q1ZB", amount: 1_240_000, days: 74 },
  { number: "VLK/0912", buyer: "Valkrie Polymers Pvt Ltd", gstin: "27AAFCV3330R1ZM", amount: 480_000, days: 61 },
  { number: "TRD/2026/0038", buyer: "Trendcast Furniture Works", gstin: "36AAHCT7777J1Z9", amount: 2_060_000, days: 112 },
  { number: "GRV/2026/1455", buyer: "Greave Electricals Co", gstin: "07AAACG2222L1ZD", amount: 815_000, days: 23 },
  { number: "NMC/2026/0771", buyer: "Nirmal Ceramics Pvt Ltd", gstin: "19AAGCN5555P1ZY", amount: 1_690_000, days: 88 },
];

/** Simulated accounting-source sync: ingests the next batch of pending invoices. */
export async function POST() {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const existing = await prisma.invoice.findMany({
    where: { orgId: org.id },
    select: { number: true },
  });
  const have = new Set(existing.map((e) => e.number));
  const batch = POOL.filter((p) => !have.has(p.number)).slice(0, 3);

  if (batch.length === 0) {
    return NextResponse.json({ synced: 0, invoices: [], message: "Source fully reconciled — nothing new to ingest" });
  }

  const now = Date.now();
  const rows: string[] = [];
  for (const p of batch) {
    const buyer = await prisma.buyer.upsert({
      where: { orgId_name: { orgId: org.id, name: p.buyer } },
      create: { orgId: org.id, name: p.buyer, gstin: p.gstin },
      update: {},
    });
    const issuedOn = new Date(now - p.days * 86_400_000);
    const invoice = await prisma.invoice.create({
      data: {
        orgId: org.id,
        buyerId: buyer.id,
        number: p.number,
        amount: p.amount,
        issuedOn,
        dueOn: new Date(issuedOn.getTime() + 45 * 86_400_000),
        status: "watch",
      },
    });
    const od = daysOverdue({ dueOn: invoice.dueOn });
    await prisma.event.createMany({
      data: [
        { orgId: org.id, invoiceId: invoice.id, type: "sync", title: `Invoice ${p.number} ingested from ${org.source === "manual" ? "manual entry" : org.source} — ₹${Math.round(p.amount).toLocaleString("en-IN")}` },
        ...(od > 0 ? [{ orgId: org.id, invoiceId: invoice.id, type: "detect", title: `${p.buyer} crossed day 45 — §16 interest now accruing` }] : []),
      ],
    });
    rows.push(invoice.id);
  }

  const invoices = await prisma.invoice.findMany({
    where: { id: { in: rows } },
    include: { ...invoiceInclude },
  });

  return NextResponse.json({
    synced: rows.length,
    invoices: invoices.map((inv) => serializeInvoice(inv)),
  });
}
