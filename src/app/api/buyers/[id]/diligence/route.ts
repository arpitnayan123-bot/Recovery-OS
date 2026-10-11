import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { getSessionUser, audit, AUDIT } from "@/lib/auth";
import { prisma, buyerRiskScore } from "@/lib/recovery";
import ZAI from "z-ai-web-dev-sdk";

type DiligenceSignal = { type: string; text: string; source?: string; tone: "alert" | "flare" | "mint" | "muted" };
type DiligenceReport = {
  summary: string;
  riskLevel: "low" | "moderate" | "elevated" | "high";
  riskScore: number;
  signals: DiligenceSignal[];
  sources: { url: string; name: string; snippet: string; host_name: string; date: string }[];
  runAt: string;
};

const SYSTEM_PROMPT = `You are a credit-risk analyst specialised in Indian B2B buyer due diligence. You are given the buyer's name, GSTIN and the supplier's payment history with them, plus a set of public web-search results. Produce a concise due-diligence report.

Rules:
- Ground every claim in either the supplier's history or a cited web source. Never fabricate.
- Indian context: GST status, IBC/NCLT proceedings, MSME Samadhaan references, news, regulator action.
- If the web evidence is thin, say so. Do not invent defaults.
- Risk score: 0-100 (100 = safest). Risk level: low (>75), moderate (55-74), elevated (35-54), high (<35).

Return ONLY JSON (no markdown fences, no prose outside JSON):
{
  "summary": "string (2-4 sentences)",
  "riskLevel": "low|moderate|elevated|high",
  "riskScore": number,
  "signals": [{ "type": "gst_status|payment_history|legal_proceeding|news|regulator|financials", "text": "string", "source": "string (url or 'supplier ledger')", "tone": "alert|flare|mint|muted" }]
}`;

function parseJson(text: string): any {
  let t = text.trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("No JSON");
  return JSON.parse(t.slice(s, e + 1));
}

function levelFromScore(score: number): DiligenceReport["riskLevel"] {
  if (score > 75) return "low";
  if (score >= 55) return "moderate";
  if (score >= 35) return "elevated";
  return "high";
}

function fallbackReport(buyer: { name: string; gstin: string | null }, history: { count: number; overdue: number; avgDaysLate: number; lateRatio: number; totalExposure: number }): DiligenceReport {
  const score = buyerRiskScore(history.avgDaysLate, history.lateRatio);
  const level = levelFromScore(score);
  const signals: DiligenceSignal[] = [
    {
      type: "payment_history",
      text: `${history.count} invoice${history.count === 1 ? "" : "s"} on file; ${history.overdue} went past the §15 45-day term; average lateness ${history.avgDaysLate} days; ${Math.round(history.lateRatio * 100)}% late ratio.`,
      source: "supplier ledger",
      tone: level === "high" ? "alert" : level === "elevated" ? "flare" : "muted",
    },
  ];
  return {
    summary: `Public web evidence was unavailable for this run, so this report is grounded in the supplier's own ledger. ${buyer.name} shows a ${level}-risk payment pattern based on ${history.count} invoices (avg ${history.avgDaysLate} days late, ${Math.round(history.lateRatio * 100)}% late). Run a fresh diligence pass to enrich with public records.`,
    riskLevel: level,
    riskScore: score,
    signals,
    sources: [],
    runAt: new Date().toISOString(),
  };
}

/** POST /api/buyers/[id]/diligence — run a web-search-enriched risk report on a buyer. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });
  const user = await getSessionUser();
  const { id } = await ctx.params;

  const buyer = await prisma.buyer.findFirst({ where: { id, orgId: org.id }, include: { invoices: true } });
  if (!buyer) return NextResponse.json({ error: "Buyer not found" }, { status: 404 });

  // supplier-side history
  const now = new Date();
  const live = buyer.invoices.filter((i) => i.status !== "recovered");
  const overdue = buyer.invoices.filter((i) => {
    const od = Math.max(0, Math.floor((now.getTime() - i.dueOn.getTime()) / 86_400_000));
    return od > 0 && i.status !== "recovered";
  });
  const lateInvoices = buyer.invoices.filter((i) => {
    const od = i.recoveredAt
      ? Math.max(0, Math.floor((i.recoveredAt.getTime() - i.dueOn.getTime()) / 86_400_000))
      : Math.max(0, Math.floor((now.getTime() - i.dueOn.getTime()) / 86_400_000));
    return od > 0;
  });
  const avgDaysLate = lateInvoices.length
    ? Math.round(lateInvoices.reduce((s, i) => {
        const od = i.recoveredAt
          ? Math.max(0, Math.floor((i.recoveredAt.getTime() - i.dueOn.getTime()) / 86_400_000))
          : Math.max(0, Math.floor((now.getTime() - i.dueOn.getTime()) / 86_400_000));
        return s + od;
      }, 0) / lateInvoices.length)
    : 0;
  const history = {
    count: buyer.invoices.length,
    overdue: overdue.length,
    avgDaysLate,
    lateRatio: buyer.invoices.length ? lateInvoices.length / buyer.invoices.length : 0,
    totalExposure: live.reduce((s, i) => s + i.amount, 0),
  };

  let sources: DiligenceReport["sources"] = [];
  try {
    const zai = await ZAI.create();
    const query = `${buyer.name} ${buyer.gstin ?? ""} India GST payment default NCLT IBC MSME`.trim().replace(/\s+/g, " ");
    const raw = await zai.functions.invoke("web_search", { query, num: 8 });
    if (Array.isArray(raw)) {
      sources = (raw as any[]).slice(0, 8).map((r) => ({
        url: String(r.url ?? ""),
        name: String(r.name ?? ""),
        snippet: String(r.snippet ?? ""),
        host_name: String(r.host_name ?? ""),
        date: String(r.date ?? ""),
      }));
    }

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `BUYER:\n${JSON.stringify({ name: buyer.name, gstin: buyer.gstin }, null, 2)}\n\nSUPPLIER HISTORY:\n${JSON.stringify(history, null, 2)}\n\nWEB SEARCH RESULTS (query: "${query}"):\n${JSON.stringify(sources.slice(0, 6), null, 2)}`,
        },
      ],
      stream: false,
      thinking: { type: "disabled" },
    });
    const parsed = parseJson(completion.choices?.[0]?.message?.content ?? "");
    const score = Math.max(0, Math.min(100, Number(parsed.riskScore) || buyerRiskScore(avgDaysLate, history.lateRatio)));
    const report: DiligenceReport = {
      summary: String(parsed.summary ?? ""),
      riskLevel: (parsed.riskLevel as DiligenceReport["riskLevel"]) || levelFromScore(score),
      riskScore: score,
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
      sources,
      runAt: new Date().toISOString(),
    };

    await prisma.buyerDiligence.upsert({
      where: { buyerId: buyer.id },
      create: {
        buyerId: buyer.id,
        summary: report.summary,
        riskLevel: report.riskLevel,
        riskScore: report.riskScore,
        signals: JSON.stringify(report.signals),
        sources: JSON.stringify(report.sources),
      },
      update: {
        summary: report.summary,
        riskLevel: report.riskLevel,
        riskScore: report.riskScore,
        signals: JSON.stringify(report.signals),
        sources: JSON.stringify(report.sources),
        runAt: new Date(),
      },
    });
    await prisma.event.create({
      data: { orgId: org.id, invoiceId: null, type: "diligence", title: `Buyer due diligence run — ${buyer.name}`, detail: `Risk: ${report.riskLevel} (${report.riskScore}/100) · ${report.sources.length} public sources` },
    });
    await audit(org.id, user?.email ?? "anonymous", AUDIT.DILIGENCE, { buyer: buyer.name, level: report.riskLevel, score: report.riskScore });

    return NextResponse.json({ report });
  } catch (e: any) {
    console.error("[diligence] web+LLM failed, using fallback:", e?.message);
    const report = fallbackReport(buyer, history);
    await prisma.buyerDiligence.upsert({
      where: { buyerId: buyer.id },
      create: {
        buyerId: buyer.id,
        summary: report.summary,
        riskLevel: report.riskLevel,
        riskScore: report.riskScore,
        signals: JSON.stringify(report.signals),
        sources: JSON.stringify(report.sources),
      },
      update: {
        summary: report.summary,
        riskLevel: report.riskLevel,
        riskScore: report.riskScore,
        signals: JSON.stringify(report.signals),
        sources: JSON.stringify(report.sources),
        runAt: new Date(),
      },
    });
    return NextResponse.json({ report, fallback: true });
  }
}

/** GET /api/buyers/[id]/diligence — return the most recent diligence report for a buyer. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });
  const { id } = await ctx.params;
  const d = await prisma.buyerDiligence.findUnique({
    where: { buyerId: id },
  });
  if (!d) return NextResponse.json({ report: null });
  return NextResponse.json({
    report: {
      summary: d.summary,
      riskLevel: d.riskLevel,
      riskScore: d.riskScore,
      signals: JSON.parse(d.signals || "[]"),
      sources: JSON.parse(d.sources || "[]"),
      runAt: d.runAt,
    } as DiligenceReport,
  });
}
