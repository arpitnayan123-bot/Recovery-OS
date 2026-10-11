import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { prisma, invoiceInterest, interestPerSecond, stageIndexOf, STAGES, SUCCESS_FEE, MSEFC_DECISION_DAYS } from "@/lib/recovery";

export async function GET() {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const invoices = await prisma.invoice.findMany({
    where: { orgId: org.id },
    include: { buyer: true, case: true },
  });
  const events = await prisma.event.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { invoice: { select: { number: true } } },
  });

  const now = new Date();
  const live = invoices.filter((i) => i.status !== "recovered");

  let overdueCount = 0;
  let overdueAmount = 0;
  let interestAccrued = 0;
  let interestPerSec = 0;
  let outstanding = 0;
  for (const inv of live) {
    outstanding += inv.amount;
    const od = Math.max(0, Math.floor((now.getTime() - inv.dueOn.getTime()) / 86_400_000));
    if (od > 0) {
      overdueCount += 1;
      overdueAmount += inv.amount;
      interestAccrued += invoiceInterest(inv.amount, inv.dueOn, now).interest;
      interestPerSec += interestPerSecond(inv.amount, inv.dueOn, now);
    }
  }

  const recovered = invoices.filter((i) => i.status === "recovered");
  const recoveredAmount = recovered.reduce((s, i) => s + (i.recoveredAmount ?? 0), 0);
  const successFees = recovered.reduce((s, i) => s + (i.successFee ?? 0), 0);

  const pipeline = STAGES.map((s, idx) => {
    const bucket = live.filter((inv) => stageIndexOf(inv.status) === idx);
    return {
      key: s.key,
      label: s.label,
      short: s.short,
      count: bucket.length,
      amount: bucket.reduce((sum, inv) => sum + invoiceInterest(inv.amount, inv.dueOn, now).totalDue, 0),
    };
  });

  const cases = await prisma.case.findMany({
    where: { orgId: org.id, stage: { not: "award" } },
    include: { invoice: { include: { buyer: true } } },
    orderBy: { filedOn: "asc" },
  });

  const clocks = cases.map((c) => {
    const od = Math.max(0, Math.floor((now.getTime() - c.invoice.dueOn.getTime()) / 86_400_000));
    const { totalDue } = invoiceInterest(c.invoice.amount, c.invoice.dueOn, now);
    const decisionBy = new Date(c.filedOn.getTime() + MSEFC_DECISION_DAYS * 86_400_000);
    return {
      id: c.id,
      caseNumber: c.caseNumber,
      stage: c.stage,
      buyer: c.invoice.buyer.name,
      invoiceNumber: c.invoice.number,
      claim: totalDue,
      filedOn: c.filedOn,
      decisionBy,
      daysLeft: Math.max(0, Math.ceil((decisionBy.getTime() - now.getTime()) / 86_400_000)),
      hearingOn: c.hearingOn,
      overdue: od,
    };
  });

  return NextResponse.json({
    org: { name: org.name, gstin: org.gstin, source: org.source, isDemo: org.isDemo, createdAt: org.createdAt },
    kpis: {
      invoiceCount: invoices.length,
      liveCount: live.length,
      outstanding,
      overdueCount,
      overdueAmount,
      interestAccrued,
      interestPerSecond: interestPerSec,
      claimable: outstanding + interestAccrued,
      recoveredAmount,
      recoveredCount: recovered.length,
      successFees,
      feeRate: SUCCESS_FEE,
      netToSupplier: recoveredAmount - successFees,
    },
    pipeline,
    clocks,
    feed: events.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      detail: e.detail,
      createdAt: e.createdAt,
      invoiceNumber: e.invoice?.number ?? null,
    })),
  });
}
