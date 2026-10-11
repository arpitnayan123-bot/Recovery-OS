import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { prisma, invoiceInterest, daysOverdue, STAGES, stageIndexOf } from "@/lib/recovery";

const DAY = 86_400_000;

/**
 * GET /api/analytics — portfolio analytics for the charts page.
 * Returns: aging buckets, recovery velocity (6 months), status distribution,
 * buyer concentration, and a 30-day §16 accrual trend.
 */
export async function GET() {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const invoices = await prisma.invoice.findMany({
    where: { orgId: org.id },
    include: { buyer: true, case: true },
  });
  const now = new Date();

  /* ---------- aging buckets ---------- */
  const buckets = [
    { key: "current", label: "Within term (≤45d)", min: -Infinity, max: 0 },
    { key: "late", label: "46–90 days", min: 1, max: 90 },
    { key: "aged", label: "91–180 days", min: 91, max: 180 },
    { key: "stale", label: "180+ days", min: 181, max: Infinity },
  ];
  const live = invoices.filter((i) => i.status !== "recovered");
  const aging = buckets.map((b) => {
    const inBucket = live.filter((i) => {
      const od = daysOverdue({ dueOn: i.dueOn }, now);
      return od >= b.min && od <= b.max;
    });
    const principal = inBucket.reduce((s, i) => s + i.amount, 0);
    const interest = inBucket.reduce((s, i) => s + invoiceInterest(i.amount, i.dueOn, now).interest, 0);
    return { key: b.key, label: b.label, count: inBucket.length, principal, interest, total: principal + interest };
  });

  /* ---------- recovery velocity (last 6 months) ---------- */
  const months: { label: string; recovered: number; count: number; fees: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const rec = invoices.filter((inv) => inv.recoveredAt && inv.recoveredAt >= start && inv.recoveredAt < end);
    months.push({
      label: start.toLocaleDateString("en-IN", { month: "short" }),
      recovered: rec.reduce((s, inv) => s + (inv.recoveredAmount ?? 0), 0),
      count: rec.length,
      fees: rec.reduce((s, inv) => s + (inv.successFee ?? 0), 0),
    });
  }

  /* ---------- status distribution ---------- */
  const statusDist = STAGES.map((s, idx) => {
    const bucket = invoices.filter((inv) => stageIndexOf(inv.status) === idx);
    return {
      key: s.key,
      label: s.label,
      count: bucket.length,
      amount: bucket.reduce((sum, inv) => sum + inv.amount, 0),
    };
  });

  /* ---------- buyer concentration ---------- */
  const byBuyer = new Map<string, { count: number; amount: number; overdue: number }>();
  for (const inv of live) {
    const e = byBuyer.get(inv.buyer.name) ?? { count: 0, amount: 0, overdue: 0 };
    e.count++;
    e.amount += inv.amount;
    if (daysOverdue({ dueOn: inv.dueOn }, now) > 0) e.overdue++;
    byBuyer.set(inv.buyer.name, e);
  }
  const concentration = [...byBuyer.entries()]
    .map(([name, e]) => ({ name, ...e }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
  const totalExposure = live.reduce((s, i) => s + i.amount, 0);

  /* ---------- 30-day §16 accrual trend (projected) ---------- */
  const trend: { day: string; interest: number }[] = [];
  const baseInterest = live.reduce((s, i) => s + invoiceInterest(i.amount, i.dueOn, now).interest, 0);
  for (let d = 29; d >= 0; d--) {
    const t = new Date(now.getTime() - d * DAY);
    const interestAtT = live.reduce((s, i) => {
      const od = daysOverdue({ dueOn: i.dueOn }, t);
      if (od <= 0) return s;
      return s + invoiceInterest(i.amount, i.dueOn, t).interest;
    }, 0);
    trend.push({ day: t.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), interest: Math.round(interestAtT) });
  }

  /* ---------- top overdue invoices (by claimable) ---------- */
  const topOverdue = live
    .filter((i) => daysOverdue({ dueOn: i.dueOn }, now) > 0)
    .map((i) => ({
      number: i.number,
      buyer: i.buyer.name,
      days: daysOverdue({ dueOn: i.dueOn }, now),
      principal: i.amount,
      interest: invoiceInterest(i.amount, i.dueOn, now).interest,
      total: invoiceInterest(i.amount, i.dueOn, now).totalDue,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return NextResponse.json({
    summary: {
      invoiceCount: invoices.length,
      liveCount: live.length,
      recoveredCount: invoices.filter((i) => i.status === "recovered").length,
      totalExposure,
      baseInterest: Math.round(baseInterest),
      asOf: now.toISOString(),
    },
    aging,
    recovery: months,
    statusDist,
    concentration,
    trend,
    topOverdue,
  });
}
