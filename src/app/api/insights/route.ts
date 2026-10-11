import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { getSessionUser, audit, AUDIT } from "@/lib/auth";
import { prisma, invoiceInterest, daysOverdue, SUCCESS_FEE, STAGES, stageIndexOf } from "@/lib/recovery";
import ZAI from "z-ai-web-dev-sdk";

type ActionItem = {
  title: string;
  rationale: string;
  priority: "P0" | "P1" | "P2" | "P3";
  effort: "quick" | "moderate" | "heavy";
  target?: string; // invoice number or buyer
  amount?: number;
};

type InsightPayload = {
  narrative: string;
  actions: ActionItem[];
  risks: { label: string; detail: string; tone: "alert" | "flare" | "mint" }[];
  opportunities: { label: string; detail: string }[];
  generatedAt: string;
};

const SYSTEM_PROMPT = `You are Recovery OS's senior recovery strategist — an expert in Indian MSME receivables recovery under the MSMED Act, 2006 (Sections 15, 16, 18, 19).

You receive a live portfolio snapshot of a supplier's outstanding invoices. Your job is to produce a prioritised recovery action plan that the supplier can execute immediately.

Rules:
- Cite the relevant section (§15/§16/§18/§19) where useful.
- Prioritise invoices whose §16 interest is compounding fastest and whose MSEFC 90-day clocks are closest to expiry.
- Flag concentration risk (one buyer holding most of the principal).
- Be concrete: reference invoice numbers and rupee amounts.
- Keep the narrative to 2-3 sentences.

Return ONLY a JSON object with this exact shape (no markdown, no prose outside the JSON):
{
  "narrative": "string",
  "actions": [{ "title": "string", "rationale": "string", "priority": "P0|P1|P2|P3", "effort": "quick|moderate|heavy", "target": "string (invoice number or buyer name)", "amount": number }],
  "risks": [{ "label": "string", "detail": "string", "tone": "alert|flare|mint" }],
  "opportunities": [{ "label": "string", "detail": "string" }]
}

Provide 3-6 actions, 2-4 risks, 1-3 opportunities.`;

/** Build a compact, LLM-friendly snapshot of the org's portfolio. */
async function buildPortfolioBrief(orgId: string) {
  const org = await prisma.org.findUnique({ where: { id: orgId } });
  if (!org) throw new Error("No org");
  const invoices = await prisma.invoice.findMany({
    where: { orgId },
    include: { buyer: true, case: true },
  });
  const now = new Date();
  const live = invoices.filter((i) => i.status !== "recovered");

  const rows = live.map((i) => {
    const od = daysOverdue({ dueOn: i.dueOn }, now);
    const { interest, totalDue } = invoiceInterest(i.amount, i.dueOn, now);
    return {
      number: i.number,
      buyer: i.buyer.name,
      buyer_gstin: i.buyer.gstin,
      amount: Math.round(i.amount),
      days_overdue: od,
      interest_accrued: Math.round(interest),
      total_claimable: Math.round(totalDue),
      status: i.status,
      stage: STAGES[stageIndexOf(i.status)].label,
      case_stage: i.case?.stage ?? null,
      case_filed_on: i.case?.filedOn ?? null,
      hearing_on: i.case?.hearingOn ?? null,
    };
  });

  const totalOutstanding = live.reduce((s, i) => s + i.amount, 0);
  const totalInterest = live.reduce((s, i) => s + invoiceInterest(i.amount, i.dueOn, now).interest, 0);
  const recovered = invoices.filter((i) => i.status === "recovered");
  const recoveredAmount = recovered.reduce((s, i) => s + (i.recoveredAmount ?? 0), 0);

  // buyer concentration
  const byBuyer = new Map<string, number>();
  for (const i of live) byBuyer.set(i.buyer.name, (byBuyer.get(i.buyer.name) ?? 0) + i.amount);
  const concentration = [...byBuyer.entries()].sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({
    buyer: name,
    exposure: Math.round(amount),
    share_pct: Math.round((amount / Math.max(1, totalOutstanding)) * 100),
  }));

  return {
    supplier: { name: org.name, gstin: org.gstin, city: org.city },
    as_of: now.toISOString(),
    kpis: {
      live_invoices: live.length,
      outstanding_principal: Math.round(totalOutstanding),
      interest_accrued: Math.round(totalInterest),
      total_claimable: Math.round(totalOutstanding + totalInterest),
      recovered_to_date: Math.round(recoveredAmount),
      recovered_count: recovered.length,
      success_fee_rate: SUCCESS_FEE,
    },
    buyer_concentration: concentration,
    invoices: rows,
  };
}

function extractJson(text: string): any {
  // strip code fences if present, then find the first balanced { ... }
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("LLM did not return JSON");
  return JSON.parse(t.slice(start, end + 1));
}

function fallbackInsight(brief: any): InsightPayload {
  // deterministic, useful even if the LLM is unreachable
  const top = [...brief.invoices].sort((a, b) => b.interest_accrued - a.interest_accrued).slice(0, 4);
  const actions: ActionItem[] = top.map((i) => ({
    title: i.status === "watch"
      ? `Serve §15/§16 demand on ${i.buyer} (invoice ${i.number})`
      : i.status === "reminder_sent"
        ? `Seal evidence pack for ${i.number} and file on ODR`
        : i.case_stage && i.case_stage !== "award"
          ? `Advance ${i.number} — ${i.case_stage} → next hearing stage`
          : `Recover ${i.number} — ${i.total_claimable} claimable`,
    rationale: `${i.days_overdue} days overdue, ₹${i.interest_accrued} interest accrued (3× bank rate, monthly compound). Stage: ${i.stage}.`,
    priority: i.interest_accrued > 200000 ? "P0" : i.interest_accrued > 50000 ? "P1" : "P2",
    effort: i.status === "watch" ? "quick" : i.status === "reminder_sent" ? "moderate" : "heavy",
    target: i.number,
    amount: i.total_claimable,
  }));
  const topBuyer = brief.buyer_concentration[0];
  return {
    narrative: `₹${brief.kpis.total_claimable.toLocaleString("en-IN")} claimable across ${brief.kpis.live_invoices} live invoices, with ₹${brief.kpis.interest_accrued.toLocaleString("en-IN")} in §16 interest already accrued. ${topBuyer ? `${topBuyer.buyer} holds ${topBuyer.share_pct}% of your exposure — concentration risk.` : ""} Prioritise the fastest-compounding invoices below.`,
    actions,
    risks: topBuyer && topBuyer.share_pct > 40
      ? [{ label: "Buyer concentration", detail: `${topBuyer.buyer} holds ${topBuyer.share_pct}% of outstanding principal (₹${topBuyer.exposure.toLocaleString("en-IN")}). A single default capsizes recovery.`, tone: "alert" }]
      : [],
    opportunities: [{ label: "Compound interest is free money", detail: "Every day an overdue invoice sits, §16 interest accrues at 3× the bank rate. Filing faster directly increases the recovered amount." }],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * GET /api/insights — generate (or refresh) an AI recovery action plan.
 * Query: ?refresh=1 to force a fresh LLM call.
 */
export async function GET(req: Request) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });
  const user = await getSessionUser();
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";

  // serve cached insight if fresh (< 10 min) unless refresh requested
  if (!refresh) {
    const cached = await prisma.insight.findFirst({
      where: { orgId: org.id, kind: "portfolio_brief" },
      orderBy: { createdAt: "desc" },
    });
    if (cached && Date.now() - cached.createdAt.getTime() < 10 * 60_000) {
      return NextResponse.json({ insight: JSON.parse(cached.payload), cached: true, generatedAt: cached.createdAt });
    }
  }

  const brief = await buildPortfolioBrief(org.id);
  if (brief.invoices.length === 0) {
    return NextResponse.json({
      insight: {
        narrative: "No live invoices yet. Connect a source, run a sync, or import a CSV to unlock AI-driven recovery recommendations.",
        actions: [],
        risks: [],
        opportunities: [],
        generatedAt: new Date().toISOString(),
      } satisfies InsightPayload,
    });
  }

  let insight: InsightPayload;
  let usedAI = false;
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        { role: "user", content: `Portfolio snapshot (JSON):\n\n${JSON.stringify(brief, null, 2)}` },
      ],
      stream: false,
      thinking: { type: "disabled" },
    });
    const raw = completion.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(raw);
    insight = {
      narrative: String(parsed.narrative ?? ""),
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
      generatedAt: new Date().toISOString(),
    };
    usedAI = true;
  } catch (e: any) {
    console.error("[insights] LLM failed, using fallback:", e?.message);
    insight = fallbackInsight(brief);
  }

  await prisma.insight.create({
    data: { orgId: org.id, kind: "portfolio_brief", payload: JSON.stringify(insight) },
  });
  await prisma.event.create({
    data: { orgId: org.id, type: "insight", title: `AI recovery action plan ${usedAI ? "generated" : "refreshed"}`, detail: `${insight.actions.length} prioritised actions · ${insight.risks.length} risk flags` },
  });
  await audit(org.id, user?.email ?? "anonymous", AUDIT.INSIGHT, { usedAI, actions: insight.actions.length });

  return NextResponse.json({ insight, cached: false, usedAI, generatedAt: insight.generatedAt });
}
