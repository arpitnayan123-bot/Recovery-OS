import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { getSessionUser, audit, AUDIT } from "@/lib/auth";
import { prisma, invoiceInterest, daysOverdue, interestPerSecond, MSEFC_DECISION_DAYS } from "@/lib/recovery";
import ZAI from "z-ai-web-dev-sdk";

const DAY = 86_400_000;

const NARRATIVE_SYSTEM = `You are Recovery OS's cost-of-inaction analyst. You receive a portfolio forecast (bleed rates, projected interest, MSEFC clock risk). Write a single tight paragraph (2-3 sentences, max 60 words) in plain English that tells the supplier exactly what inaction is costing them right now and which invoice/buyer is the biggest leak. Cite real invoice numbers and rupee amounts from the data. Be direct, not alarmist. Output only the paragraph — no markdown, no headers.`;

/**
 * GET /api/forecast
 * The "cost of inaction" engine. Computes, for the live portfolio:
 *  - how much §16 interest will accrue over the next 7 / 30 / 60 / 90 days
 *    (assuming no invoices are recovered / no new invoices are added)
 *  - which ODR cases are at risk of breaching the 90-day MSEFC decision window
 *  - per-day and per-hour bleed rates (so the UI can show a live ticker)
 *  - an AI-narrated recommendation (optional, ?ai=1) summarising the cost
 *
 * Every figure is computed from the same §16 engine — no guessing.
 */
export async function GET(req: Request) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });
  const user = await getSessionUser();

  const invoices = await prisma.invoice.findMany({
    where: { orgId: org.id },
    include: { buyer: true, case: true },
  });
  const cases = await prisma.case.findMany({
    where: { orgId: org.id, stage: { not: "award" } },
    include: { invoice: { include: { buyer: true } } },
  });

  const now = new Date();
  const live = invoices.filter((i) => i.status !== "recovered");

  // projected interest accrual over the horizon windows
  const horizons = [7, 30, 60, 90];
  const projection = horizons.map((days) => {
    const future = new Date(now.getTime() + days * DAY);
    let interestNow = 0;
    let interestFuture = 0;
    let principal = 0;
    const invoiceBreakdown: { number: string; buyer: string; interestNow: number; interestFuture: number; delta: number }[] = [];

    for (const inv of live) {
      const od = daysOverdue({ dueOn: inv.dueOn }, now);
      if (od <= 0) {
        // not overdue yet — it might become overdue within the window
        const futureOd = daysOverdue({ dueOn: inv.dueOn }, future);
        if (futureOd <= 0) continue; // still inside term
        // accrues only from the day it breaks term
        principal += inv.amount;
        const futureInterest = invoiceInterest(inv.amount, inv.dueOn, future).interest;
        interestFuture += futureInterest;
        invoiceBreakdown.push({ number: inv.number, buyer: inv.buyer.name, interestNow: 0, interestFuture: Math.round(futureInterest), delta: Math.round(futureInterest) });
      } else {
        principal += inv.amount;
        const now_ = invoiceInterest(inv.amount, inv.dueOn, now).interest;
        const fut = invoiceInterest(inv.amount, inv.dueOn, future).interest;
        interestNow += now_;
        interestFuture += fut;
        invoiceBreakdown.push({ number: inv.number, buyer: inv.buyer.name, interestNow: Math.round(now_), interestFuture: Math.round(fut), delta: Math.round(fut - now_) });
      }
    }

    invoiceBreakdown.sort((a, b) => b.delta - a.delta);

    return {
      days,
      label: days === 7 ? "Next 7 days" : days === 30 ? "Next 30 days" : days === 60 ? "Next 60 days" : "Next 90 days",
      interestAccruedNow: Math.round(interestNow),
      interestAccruedFuture: Math.round(interestFuture),
      incrementalInterest: Math.round(Math.max(0, interestFuture - interestNow)),
      principal,
      topContributors: invoiceBreakdown.slice(0, 5),
    };
  });

  // live bleed rates
  const perSecond = live.reduce((s, i) => s + interestPerSecond(i.amount, i.dueOn, now), 0);
  const perDay = Math.round(perSecond * 86400);
  const perHour = Math.round(perSecond * 3600);
  const perMinute = Math.round(perSecond * 60);

  // MSEFC clock risk — cases approaching the 90-day decision deadline
  const clockRisk = cases.map((c) => {
    const decisionBy = new Date(c.filedOn.getTime() + MSEFC_DECISION_DAYS * DAY);
    const daysLeft = Math.ceil((decisionBy.getTime() - now.getTime()) / DAY);
    const { totalDue } = invoiceInterest(c.invoice.amount, c.invoice.dueOn, now);
    return {
      id: c.id,
      caseNumber: c.caseNumber,
      stage: c.stage,
      buyer: c.invoice.buyer.name,
      invoiceNumber: c.invoice.number,
      claim: Math.round(totalDue),
      filedOn: c.filedOn,
      decisionBy,
      daysLeft,
      atRisk: daysLeft <= 30,
      critical: daysLeft <= 14,
    };
  }).sort((a, b) => a.daysLeft - b.daysLeft);

  // opportunity: if all overdue invoices were recovered today
  const totalClaimableNow = live.reduce((s, i) => s + invoiceInterest(i.amount, i.dueOn, now).totalDue, 0);

  // day-by-day series for the 90-day chart (compound interest curve)
  const series: { day: number; label: string; interest: number; total: number }[] = [];
  for (let d = 0; d <= 90; d += 3) {
    const future = new Date(now.getTime() + d * DAY);
    let interestAtFuture = 0;
    for (const inv of live) {
      const od = daysOverdue({ dueOn: inv.dueOn }, future);
      if (od > 0) interestAtFuture += invoiceInterest(inv.amount, inv.dueOn, future).interest;
    }
    series.push({
      day: d,
      label: d === 0 ? "now" : d === 90 ? "day 90" : `+${d}d`,
      interest: Math.round(interestAtFuture),
      total: Math.round(interestAtFuture + live.reduce((s, i) => s + i.amount, 0)),
    });
  }

  await audit(org.id, user?.email ?? "anonymous", "forecast.view", { liveCount: live.length, perDay });

  const base = {
    asOf: now.toISOString(),
    liveCount: live.length,
    principalAtRisk: live.reduce((s, i) => s + i.amount, 0),
    perSecond,
    perMinute,
    perHour,
    perDay,
    projection,
    series,
    clockRisk,
    totalClaimableNow: Math.round(totalClaimableNow),
    ninetyDayBleed: projection.find((p) => p.days === 90)?.incrementalInterest ?? 0,
  };

  // optional AI narrative (?ai=1) — plain-English cost-of-inaction summary
  const url = new URL(req.url);
  if (url.searchParams.get("ai") === "1" && live.length > 0) {
    let narrative: string | null = null;
    try {
      const zai = await ZAI.create();
      const top = projection.find((p) => p.days === 90)?.topContributors?.slice(0, 3) ?? [];
      const brief = {
        perDay,
        perHour,
        ninetyDayBleed: base.ninetyDayBleed,
        totalClaimableNow: base.totalClaimableNow,
        liveCount: live.length,
        topLeaks: top,
        criticalClocks: clockRisk.filter((c) => c.critical).map((c) => ({ caseNumber: c.caseNumber, buyer: c.buyer, daysLeft: c.daysLeft })),
      };
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: NARRATIVE_SYSTEM },
          { role: "user", content: `Forecast snapshot (JSON):\n${JSON.stringify(brief, null, 2)}` },
        ],
        stream: false,
        thinking: { type: "disabled" },
      });
      narrative = (completion.choices?.[0]?.message?.content ?? "").trim() || null;
    } catch (e: any) {
      console.error("[forecast] AI narrative failed:", e?.message);
    }
    return NextResponse.json({ ...base, narrative, narrativeAI: !!narrative });
  }

  return NextResponse.json(base);
}
