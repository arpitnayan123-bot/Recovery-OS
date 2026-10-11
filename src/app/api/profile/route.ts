import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { getSessionUser } from "@/lib/auth";
import { prisma, invoiceInterest, daysOverdue, interestPerSecond, SUCCESS_FEE, STAGES, stageIndexOf } from "@/lib/recovery";

const DAY = 86_400_000;

/**
 * GET /api/profile
 * The full consumer/supplier profile: org details, linked user account,
 * recovery-engine status, live KPIs, pipeline distribution, top buyers,
 * digest preferences, and account security posture. Powers the profile page.
 */
export async function GET() {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });
  const user = await getSessionUser();

  const [invoices, cases, events, buyers, digest, importBatches, auditCount] = await Promise.all([
    prisma.invoice.findMany({ where: { orgId: org.id }, include: { buyer: true, case: true } }),
    prisma.case.findMany({ where: { orgId: org.id } }),
    prisma.event.count({ where: { orgId: org.id } }),
    prisma.buyer.findMany({ where: { orgId: org.id }, include: { invoices: true } }),
    prisma.digestPreference.findUnique({ where: { orgId: org.id } }),
    prisma.importBatch.count({ where: { orgId: org.id } }),
    prisma.auditLog.count({ where: { orgId: org.id } }),
  ]);

  const now = new Date();
  const live = invoices.filter((i) => i.status !== "recovered");
  const recovered = invoices.filter((i) => i.status === "recovered");

  let outstanding = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  let interestAccrued = 0;
  let interestPerSec = 0;
  for (const inv of live) {
    outstanding += inv.amount;
    const od = daysOverdue({ dueOn: inv.dueOn }, now);
    if (od > 0) {
      overdueCount++;
      overdueAmount += inv.amount;
      interestAccrued += invoiceInterest(inv.amount, inv.dueOn, now).interest;
      interestPerSec += interestPerSecond(inv.amount, inv.dueOn, now);
    }
  }

  const recoveredAmount = recovered.reduce((s, i) => s + (i.recoveredAmount ?? 0), 0);
  const successFees = recovered.reduce((s, i) => s + (i.successFee ?? 0), 0);

  const pipeline = STAGES.map((s, idx) => {
    const bucket = invoices.filter((inv) => stageIndexOf(inv.status) === idx && inv.status !== "recovered");
    return { key: s.key, label: s.label, short: s.short, count: bucket.length, amount: bucket.reduce((sum, inv) => sum + inv.amount, 0) };
  });

  // top buyers by live exposure
  const buyerExposure = buyers.map((b) => {
    const liveInvoices = b.invoices.filter((i) => i.status !== "recovered");
    return {
      id: b.id,
      name: b.name,
      gstin: b.gstin,
      city: b.city,
      liveCount: liveInvoices.length,
      totalInvoices: b.invoices.length,
      exposure: liveInvoices.reduce((s, i) => s + i.amount, 0),
    };
  }).filter((b) => b.totalInvoices > 0).sort((a, b) => b.exposure - a.exposure);

  // engine status
  const engineOn = live.length > 0;
  const lastEvent = events > 0 ? "active" : "idle";

  return NextResponse.json({
    org: {
      id: org.id,
      name: org.name,
      contact: org.contact,
      gstin: org.gstin,
      city: org.city,
      source: org.source,
      isDemo: org.isDemo,
      createdAt: org.createdAt,
    },
    user: user
      ? { id: user.id, email: user.email, name: user.name, phone: user.phone, createdAt: user.createdAt }
      : null,
    engine: {
      status: engineOn ? "on" : "idle",
      label: engineOn ? "Recovery engine running" : "No live invoices",
      lastEvent,
      liveInvoices: live.length,
      monitoring: live.length > 0,
    },
    kpis: {
      invoiceCount: invoices.length,
      liveCount: live.length,
      recoveredCount: recovered.length,
      outstanding,
      overdueCount,
      overdueAmount,
      interestAccrued: Math.round(interestAccrued),
      interestPerSecond: interestPerSec,
      claimable: Math.round(outstanding + interestAccrued),
      recoveredAmount,
      successFees,
      feeRate: SUCCESS_FEE,
      netToSupplier: recoveredAmount - successFees,
    },
    pipeline,
    topBuyers: buyerExposure.slice(0, 5),
    digest: {
      emailEnabled: digest?.emailEnabled ?? true,
      whatsappEnabled: digest?.whatsappEnabled ?? false,
      smsEnabled: digest?.smsEnabled ?? false,
      cadence: digest?.cadence ?? "instant",
      alertOverdue: digest?.alertOverdue ?? true,
      alertClockRisk: digest?.alertClockRisk ?? true,
      alertForecast: digest?.alertForecast ?? false,
      forecastThreshold: digest?.forecastThreshold ?? 10000,
    },
    activity: {
      totalEvents: events,
      importBatches,
      auditEntries: auditCount,
      activeCases: cases.filter((c) => c.stage !== "award").length,
      awardedCases: cases.filter((c) => c.stage === "award").length,
    },
    asOf: now.toISOString(),
  });
}
