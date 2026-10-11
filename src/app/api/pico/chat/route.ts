import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { getSessionOrg } from "@/lib/session";
import { prisma, invoiceInterest, daysOverdue, STAGES, stageIndexOf } from "@/lib/recovery";

const SYSTEM_PROMPT = `You are Pico, the friendly mascot and guide for Recovery OS — an Indian MSME statutory-recovery fintech (MSMED Act 2006). You're a helpful cloud companion who explains the product in simple terms. Keep answers short (2-4 sentences), friendly, and grounded in the MSMED Act. You can mention: §15 (45-day payment term), §16 (compound interest at 3× bank rate), §18 (MSEFC filing), §19 (75% deposit for appeal), and §43B(h) of the Income Tax Act (disallows the buyer's tax deduction on MSME payments until actually paid — the strongest lever). Be warm and conversational. If asked about the user's portfolio, use the portfolio context provided.`;

/**
 * POST /api/pico/chat
 * Pico's LLM-powered chat. Includes portfolio context when the user has a session.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const message = String(body?.message ?? "").trim();
  const history: { role: string; text: string }[] = Array.isArray(body?.history) ? body.history.slice(-6) : [];

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // build portfolio context if the user has a session
  let portfolioContext = "";
  const org = await getSessionOrg();
  if (org) {
    const invoices = await prisma.invoice.findMany({
      where: { orgId: org.id },
      include: { buyer: true },
      take: 20,
    });
    const now = new Date();
    const live = invoices.filter((i) => i.status !== "recovered");
    if (live.length > 0) {
      const totalOutstanding = live.reduce((s, i) => s + i.amount, 0);
      const totalInterest = live.reduce((s, i) => {
        const od = Math.max(0, Math.floor((now.getTime() - i.dueOn.getTime()) / 86_400_000));
        return od > 0 ? s + invoiceInterest(i.amount, i.dueOn, now).interest : s;
      }, 0);
      const overdueCount = live.filter((i) => {
        const od = Math.max(0, Math.floor((now.getTime() - i.dueOn.getTime()) / 86_400_000));
        return od > 0;
      }).length;
      portfolioContext = `\n\nUser's portfolio context: ${org.name} has ${live.length} live invoices, ${overdueCount} overdue, ₹${Math.round(totalOutstanding).toLocaleString("en-IN")} outstanding, ₹${Math.round(totalInterest).toLocaleString("en-IN")} in §16 interest accrued. Source: ${org.source} sync.`;
    }
  }

  let reply: string;
  try {
    const zai = await ZAI.create();
    const messages = [
      { role: "assistant" as const, content: SYSTEM_PROMPT + portfolioContext },
      ...history.map((h) => ({
        role: (h.role === "user" ? "user" : "assistant") as const,
        content: h.text,
      })),
      { role: "user" as const, content: message },
    ];

    const completion = await zai.chat.completions.create({
      messages,
      stream: false,
      thinking: { type: "disabled" },
    });
    reply = (completion.choices?.[0]?.message?.content ?? "").trim() || "I'm not sure about that. Could you ask differently?";
  } catch (e: any) {
    console.error("[pico/chat] LLM failed:", e?.message);
    // deterministic fallbacks for common questions
    const lower = message.toLowerCase();
    if (lower.includes("what") && lower.includes("recovery")) {
      reply = "Recovery OS recovers the money buyers owe you under the MSMED Act, 2006. It watches every invoice, switches on §16 compound interest the day a buyer defaults, serves statutory demand, seals evidence, files on the ODR portal, and tracks the case to award and money — for a 12.5% fee charged only on what's actually recovered.";
    } else if (lower.includes("§16") || lower.includes("section 16") || lower.includes("interest")) {
      reply = "§16 of the MSMED Act says a buyer who delays payment owes compound interest at three times the RBI bank rate, compounded monthly. Recovery OS computes this automatically for every overdue invoice — currently about 17.25% per annum.";
    } else if (lower.includes("msmed") || lower.includes("act")) {
      reply = "The MSMED Act, 2006 protects micro and small enterprises in India. §15 requires buyers to pay within 45 days. §16 adds compound interest at 3× bank rate if they don't. §18 lets you file with the MSEFC council. §19 requires a 75% deposit before a buyer can appeal an award.";
    } else if (lower.includes("pipeline") || lower.includes("stage")) {
      reply = "Every invoice runs through 5 stages: Monitor → Notice served → Evidence sealed → Filed on ODR → Recovery. Each stage is one click per invoice, with the statutory maths computed for you.";
    } else {
      reply = "I'm Pico, your Recovery OS guide! I can explain the MSMED Act, how §16 interest works, the recovery pipeline, or your portfolio. What would you like to know?";
    }
  }

  return NextResponse.json({ reply });
}
