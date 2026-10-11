import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { prisma, invoiceInterest, daysOverdue } from "@/lib/recovery";

type Result = {
  id: string;
  type: "invoice" | "buyer" | "case" | "page";
  label: string;
  sub: string;
  href: string;
  tone: "mint" | "flare" | "alert" | "muted";
  meta?: string;
};

const PAGES: Result[] = [
  { id: "p-overview", type: "page", label: "Overview", sub: "Console dashboard · KPIs, pipeline, clocks", href: "/console", tone: "mint" },
  { id: "p-invoices", type: "page", label: "Invoices", sub: "Ledger · §15 monitored", href: "/console/invoices", tone: "mint" },
  { id: "p-cases", type: "page", label: "ODR cases", sub: "MSEFC references · 90-day clocks", href: "/console/cases", tone: "mint" },
  { id: "p-buyers", type: "page", label: "Buyers", sub: "Counterparty risk index", href: "/console/buyers", tone: "mint" },
  { id: "p-insights", type: "page", label: "AI insights", sub: "Recovery action plan · LLM", href: "/console/insights", tone: "flare" },
  { id: "p-analytics", type: "page", label: "Analytics", sub: "Portfolio charts · aging · velocity", href: "/console/analytics", tone: "mint" },
  { id: "p-activity", type: "page", label: "Activity", sub: "Full machine feed", href: "/console/activity", tone: "muted" },
  { id: "p-audit", type: "page", label: "Audit log", sub: "Immutable accountability ledger", href: "/console/security", tone: "muted" },
  { id: "p-settings", type: "page", label: "Settings", sub: "Workspace · fee terms · wipe", href: "/console/settings", tone: "muted" },
];

const TONE_BY_STATUS: Record<string, Result["tone"]> = {
  watch: "muted",
  reminder_sent: "flare",
  evidence_ready: "flare",
  odr_filed: "mint",
  hearing: "mint",
  award: "mint",
  recovered: "mint",
};

/**
 * GET /api/search?q=...
 * Quick fuzzy search across invoices, buyers, cases + console pages.
 * Powers the Cmd+K command palette.
 */
export async function GET(req: Request) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  // always include pages (filtered) when no query; otherwise match everything
  const results: Result[] = [];

  if (!q) {
    results.push(...PAGES);
    return NextResponse.json({ results, query: q });
  }

  // pages that match
  const matchedPages = PAGES.filter((p) => p.label.toLowerCase().includes(q) || p.sub.toLowerCase().includes(q));
  results.push(...matchedPages);

  // invoices (by number or buyer name)
  const invoices = await prisma.invoice.findMany({
    where: { orgId: org.id, OR: [
      { number: { contains: q } },
      { buyer: { name: { contains: q } } },
    ] },
    include: { buyer: true },
    take: 8,
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  for (const inv of invoices) {
    const od = daysOverdue({ dueOn: inv.dueOn }, now);
    const { totalDue } = invoiceInterest(inv.amount, inv.dueOn, now);
    results.push({
      id: `inv-${inv.id}`,
      type: "invoice",
      label: inv.number,
      sub: `${inv.buyer.name} · ${inv.status.replace(/_/g, " ")}`,
      href: "/console/invoices",
      tone: TONE_BY_STATUS[inv.status] ?? "muted",
      meta: `₹${Math.round(totalDue).toLocaleString("en-IN")}${od > 0 ? ` · ${od}d overdue` : ""}`,
    });
  }

  // buyers
  const buyers = await prisma.buyer.findMany({
    where: { orgId: org.id, OR: [
      { name: { contains: q } },
      { gstin: { contains: q } },
    ] },
    take: 6,
    orderBy: { name: "asc" },
  });
  for (const b of buyers) {
    const count = await prisma.invoice.count({ where: { buyerId: b.id, status: { not: "recovered" } } });
    results.push({
      id: `buy-${b.id}`,
      type: "buyer",
      label: b.name,
      sub: `${b.gstin ?? "GSTIN —"} · ${count} live invoice${count === 1 ? "" : "s"}`,
      href: "/console/buyers",
      tone: count > 0 ? "flare" : "muted",
    });
  }

  // cases
  const cases = await prisma.case.findMany({
    where: { orgId: org.id, OR: [
      { caseNumber: { contains: q } },
      { invoice: { buyer: { name: { contains: q } } } },
      { invoice: { number: { contains: q } } },
    ] },
    include: { invoice: { include: { buyer: true } } },
    take: 6,
    orderBy: { filedOn: "desc" },
  });
  for (const c of cases) {
    results.push({
      id: `case-${c.id}`,
      type: "case",
      label: c.caseNumber,
      sub: `${c.invoice.buyer.name} · ${c.invoice.number} · ${c.stage}`,
      href: "/console/cases",
      tone: c.stage === "award" ? "mint" : "flare",
      meta: c.awardAmount ? `₹${Math.round(c.awardAmount).toLocaleString("en-IN")} decreed` : undefined,
    });
  }

  return NextResponse.json({ results, query: q });
}
