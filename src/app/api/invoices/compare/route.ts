import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { prisma, invoiceInterest, daysOverdue, interestPerSecond, stageIndexOf } from "@/lib/recovery";
import { invoiceInclude } from "@/lib/dto";

const DAY = 86_400_000;
const BANK_RATE = 5.75;
const ANNUAL = (BANK_RATE * 3) / 100;
const MONTHLY = ANNUAL / 12;

/**
 * GET /api/invoices/compare?ids=id1,id2,id3
 * Returns a side-by-side forecast comparison for up to 4 invoices —
 * each with its §16 projection curve (day 0 → 90) and key metrics.
 */
export async function GET(req: Request) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  if (ids.length < 2) {
    return NextResponse.json({ error: "Select at least 2 invoices to compare" }, { status: 400 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { id: { in: ids }, orgId: org.id },
    include: invoiceInclude,
  });

  const now = new Date();
  const comparison = invoices.map((inv) => {
    const od = daysOverdue({ dueOn: inv.dueOn }, now);
    const { interest, totalDue } = invoiceInterest(inv.amount, inv.dueOn, now);
    const perSecond = interestPerSecond(inv.amount, inv.dueOn, now);
    const recovered = inv.status === "recovered";

    // day-by-day projection (0 → 90, step 5)
    const curve: { day: number; interest: number; total: number }[] = [];
    for (let d = 0; d <= 90; d += 5) {
      const future = new Date(now.getTime() + d * DAY);
      const futureOd = Math.max(0, Math.floor((future.getTime() - inv.dueOn.getTime()) / DAY));
      const futureInterest = futureOd > 0 ? inv.amount * Math.pow(1 + MONTHLY, futureOd / 30) - inv.amount : 0;
      curve.push({
        day: d,
        interest: Math.round(futureInterest),
        total: Math.round(futureInterest + inv.amount),
      });
    }

    return {
      id: inv.id,
      number: inv.number,
      buyer: inv.buyer.name,
      gstin: inv.buyer.gstin,
      amount: inv.amount,
      status: inv.status,
      stageIndex: stageIndexOf(inv.status),
      daysOverdue: od,
      interestNow: Math.round(interest),
      totalNow: Math.round(totalDue),
      perSecond,
      perDay: Math.round(perSecond * 86400),
      ninetyDayBleed: curve[curve.length - 1].interest - curve[0].interest,
      recovered,
      recoveredAt: inv.recoveredAt,
      curve,
    };
  });

  return NextResponse.json({ comparison, asOf: now.toISOString() });
}
