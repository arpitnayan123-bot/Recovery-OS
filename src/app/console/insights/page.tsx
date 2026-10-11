"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Loader2, ArrowRight, ShieldAlert, Lightbulb, Zap, TrendingUp } from "lucide-react";
import { PageHead, inrCompact } from "@/components/console/kit";
import { cn } from "@/lib/utils";

type ActionItem = {
  title: string;
  rationale: string;
  priority: "P0" | "P1" | "P2" | "P3";
  effort: "quick" | "moderate" | "heavy";
  target?: string;
  amount?: number;
};
type InsightPayload = {
  narrative: string;
  actions: ActionItem[];
  risks: { label: string; detail: string; tone: "alert" | "flare" | "mint" }[];
  opportunities: { label: string; detail: string }[];
  generatedAt: string;
};

const PRIORITY_META: Record<string, { tone: string; label: string }> = {
  P0: { tone: "border-alert/40 bg-alert/[0.08] text-alert", label: "Critical · now" },
  P1: { tone: "border-flare/40 bg-flare/[0.08] text-flare", label: "High · today" },
  P2: { tone: "border-mint/40 bg-mint/[0.08] text-mint", label: "Medium · this week" },
  P3: { tone: "border-border bg-secondary text-muted-foreground", label: "Low · when able" },
};

const EFFORT_META: Record<string, string> = {
  quick: "≈ 2 min",
  moderate: "≈ 15 min",
  heavy: "≈ 1 hr",
};

const RISK_TONE: Record<string, string> = {
  alert: "border-alert/40 bg-alert/[0.06]",
  flare: "border-flare/40 bg-flare/[0.06]",
  mint: "border-mint/40 bg-mint/[0.06]",
};

export default function InsightsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ insight: InsightPayload; cached?: boolean; usedAI?: boolean }>({
    queryKey: ["insights"],
    queryFn: async () => (await fetch("/api/insights")).json(),
  });

  const refresh = useMutation({
    mutationFn: async () => (await fetch("/api/insights?refresh=1")).json(),
    onSuccess: () => {
      toast.success("AI action plan refreshed — new run against your live portfolio.");
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
        <div className="flex items-center gap-3 rounded-xl border border-mint/20 bg-mint/[0.04] p-6">
          <Loader2 className="h-5 w-5 animate-spin text-mint" />
          <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted-foreground">
            Recovery strategist reading your portfolio…
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-secondary/50" />
          ))}
        </div>
      </div>
    );
  }

  const insight = data?.insight;
  if (!insight) return null;

  return (
    <>
      <PageHead
        kicker="AI recovery strategist · §15 · §16 · §18 · §19"
        title="Recovery action plan"
        desc="A senior strategist reads your live portfolio, prioritises the fastest-compounding claims, flags concentration risk, and tells you exactly what to file next — grounded in the MSMED Act, 2006."
      >
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-mint px-4 h-10 text-[13px] font-semibold text-[#04140b] transition-colors hover:bg-[#4df7ae] disabled:opacity-50"
        >
          {refresh.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {refresh.isPending ? "Re-running…" : "Refresh plan"}
        </button>
      </PageHead>

      {/* narrative banner */}
      <section className="relative overflow-hidden rounded-xl border border-mint/25 bg-gradient-to-br from-mint/[0.07] to-transparent p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-mint/[0.08] blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-mint/30 bg-mint/10 text-mint">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-mint">
              {data?.usedAI ? "AI-generated · grounded in MSMED Act" : "Engine brief · deterministic"}
              {data?.cached ? " · cached" : ""}
            </p>
          </div>
          <p className="mt-4 max-w-3xl font-display text-[1.15rem] leading-relaxed tracking-[-0.01em] text-foreground">
            {insight.narrative}
          </p>
        </div>
      </section>

      {/* prioritised actions */}
      <section className="mt-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Zap className="h-4 w-4 text-mint" />
          Prioritised actions
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {insight.actions.length}
          </span>
        </h2>
        {insight.actions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-[13px] text-muted-foreground">
            No live invoices to act on yet. Sync your source or import a CSV, then refresh the plan.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {insight.actions.map((a, i) => {
              const pm = PRIORITY_META[a.priority] ?? PRIORITY_META.P3;
              return (
                <article key={i} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-colors hover:border-mint/30">
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.14em] uppercase", pm.tone)}>
                      {a.priority}
                    </span>
                    <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted-foreground">
                      {EFFORT_META[a.effort] ?? a.effort}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-[15px] font-semibold leading-snug tracking-tight">{a.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{a.rationale}</p>
                  {(a.target || a.amount) && (
                    <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3 font-mono text-[10.5px] tracking-[0.08em] text-muted-foreground">
                      {a.target && <span className="truncate">{a.target}</span>}
                      {a.amount && <span className="ml-auto text-mint">{inrCompact(a.amount)}</span>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* risks + opportunities */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <ShieldAlert className="h-4 w-4 text-alert" /> Risk flags
            <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {insight.risks.length}
            </span>
          </h2>
          {insight.risks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-[13px] text-muted-foreground">No material risks detected in the current portfolio.</p>
          ) : (
            <ul className="space-y-3">
              {insight.risks.map((r, i) => (
                <li key={i} className={cn("rounded-xl border p-4", RISK_TONE[r.tone] ?? RISK_TONE.flare)}>
                  <p className="font-display text-[14px] font-semibold">{r.label}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{r.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <Lightbulb className="h-4 w-4 text-flare" /> Opportunities
            <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {insight.opportunities.length}
            </span>
          </h2>
          {insight.opportunities.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-[13px] text-muted-foreground">No opportunities surfaced yet.</p>
          ) : (
            <ul className="space-y-3">
              {insight.opportunities.map((o, i) => (
                <li key={i} className="rounded-xl border border-border bg-card p-4">
                  <p className="flex items-center gap-2 font-display text-[14px] font-semibold">
                    <TrendingUp className="h-3.5 w-3.5 text-mint" /> {o.label}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{o.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-8 flex items-center gap-2 border-t border-border pt-5 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
        <ArrowRight className="h-3 w-3 text-mint" /> generated {new Date(insight.generatedAt).toLocaleString("en-IN")} · §16 interest is computed, not guessed
      </p>
    </>
  );
}
