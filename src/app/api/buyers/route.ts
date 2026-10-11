import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { prisma, buyerRiskScore, riskLabel, invoiceInterest } from "@/lib/recovery";

export async function GET() {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const buyers = await prisma.buyer.findMany({
    where: { orgId: org.id },
    include: { invoices: true },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const rows = buyers
    .map((b) => {
      const live = b.invoices.filter((i) => i.status !== "recovered");
      const overdueInv = live.filter((i) => now.getTime() > i.dueOn.getTime());
      const avgDaysLate = overdueInv.length
        ? Math.round(
            overdueInv.reduce((s, i) => s + Math.floor((now.getTime() - i.dueOn.getTime()) / 86_400_000), 0) /
              overdueInv.length
          )
        : 0;
      const lateRatio = b.invoices.length ? overdueInv.length / b.invoices.length : 0;
      const score = b.invoices.length === 0 ? 70 : buyerRiskScore(avgDaysLate, lateRatio);
      const label = riskLabel(score);
      const exposure = live.reduce((s, i) => s + invoiceInterest(i.amount, i.dueOn, now).totalDue, 0);
      const recovered = b.invoices
        .filter((i) => i.status === "recovered")
        .reduce((s, i) => s + (i.recoveredAmount ?? 0), 0);

      return {
        id: b.id,
        name: b.name,
        gstin: b.gstin,
        invoiceCount: b.invoices.length,
        liveCount: live.length,
        overdueCount: overdueInv.length,
        avgDaysLate,
        score,
        label: label.label,
        tone: label.tone,
        exposure,
        recovered,
        onWatchlist: score < 45,
      };
    })
    .sort((a, b) => b.exposure - a.exposure);

  return NextResponse.json({ buyers: rows });
}
