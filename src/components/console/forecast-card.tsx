"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingDown, Clock, AlertTriangle, ArrowRight, Zap, Sparkles, Loader2 } from "lucide-react";
import { inrCompact, fmtDate, LiveInterest } from "@/components/console/kit";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type Forecast = {
  asOf: string;
  liveCount: number;
  principalAtRisk: number;
  perSecond: number;
  perMinute: number;
  perHour: number;
  perDay: number;
  projection: {
    days: number;
    label: string;
    interestAccruedNow: number;
    interestAccruedFuture: number;
    incrementalInterest: number;
    principal: number;
    topContributors: { number: string; buyer: string; interestNow: number; interestFuture: number; delta: number }[];
  }[];
  clockRisk: {
    id: string;
    caseNumber: string;
    stage: string;
    buyer: string;
    invoiceNumber: string;
    claim: number;
    filedOn: string;
    decisionBy: string;
    daysLeft: number;
    atRisk: boolean;
    critical: boolean;
  }[];
  totalClaimableNow: number;
  ninetyDayBleed: number;
  narrative?: string | null;
  narrativeAI?: boolean;
};

export function ForecastCard() {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const { data, isLoading } = useQuery<Forecast>({
    queryKey: ["forecast"],
    queryFn: async () => (await fetch("/api/forecast")).json(),
    staleTime: 30_000,
  });

  const fetchNarrative = async () => {
    setNarrativeLoading(true);
    try {
      const res = await fetch("/api/forecast?ai=1");
      const d = await res.json();
      setNarrative(d.narrative ?? null);
    } catch { /* ignore */ } finally {
      setNarrativeLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <section className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
        <div className="h-5 w-40 animate-pulse rounded bg-secondary/60" />
        <div className="mt-4 h-16 animate-pulse rounded-lg bg-secondary/40" />
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary/40" />)}
        </div>
      </section>
    );
  }

  if (data.liveCount === 0) {
    return null;
  }

  const thirty = data.projection.find((p) => p.days === 30);
  const ninety = data.projection.find((p) => p.days === 90);
  const criticalClocks = data.clockRisk.filter((c) => c.critical);
  const atRiskClocks = data.clockRisk.filter((c) => c.atRisk && !c.critical);

  return (
    <section className="relative overflow-hidden rounded-xl border border-alert/25 bg-gradient-to-br from-alert/[0.06] via-card to-card p-5">
      {/* atmosphere */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-alert/[0.08] blur-3xl" />

      <div className="relative">
        {/* header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.18em] uppercase text-alert">
              <TrendingDown className="h-3.5 w-3.5" /> Cost of inaction · forecast
            </p>
            <h2 className="mt-2 font-display text-lg font-semibold tracking-tight">
              Every day you wait costs{" "}
              <span className="tabular-nums text-alert">{inr(data.perDay)}</span>
            </h2>
          </div>
          <div className="flex items-center gap-2.5">
            {!narrative && !narrativeLoading && (
              <button
                onClick={fetchNarrative}
                className="inline-flex items-center gap-1.5 rounded-lg border border-mint/30 bg-mint/[0.06] px-3 h-9 text-[11.5px] font-medium text-mint transition-colors hover:bg-mint/[0.12]"
              >
                <Sparkles className="h-3.5 w-3.5" /> Explain in plain English
              </button>
            )}
            {narrativeLoading && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-[11.5px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI analysing…
              </span>
            )}
            <div className="hidden text-right sm:block">
              <p className="font-display text-2xl font-semibold tabular-nums text-alert">
                <LiveInterest baseInterest={0} perSecond={data.perSecond} compact />
              </p>
              <p className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">bleeding now / sec</p>
            </div>
          </div>
        </div>

        {/* AI narrative */}
        {narrative && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex gap-2.5 rounded-lg border border-mint/20 bg-mint/[0.04] px-3.5 py-2.5"
          >
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
            <p className="text-[12.5px] leading-relaxed text-foreground/90">{narrative}</p>
          </motion.div>
        )}

        {/* live bleed strip */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <BleedStat label="per minute" value={inrCompact(data.perMinute)} />
          <BleedStat label="per hour" value={inrCompact(data.perHour)} />
          <BleedStat label="per day" value={inrCompact(data.perDay)} tone="alert" />
          <BleedStat label="per month" value={inrCompact(data.perDay * 30)} tone="alert" />
        </div>

        {/* horizon projections */}
        <div className="mt-5">
          <p className="mb-2.5 flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">
            <Clock className="h-3 w-3" /> Projected §16 interest if no action taken
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {data.projection.map((p, i) => (
              <motion.div
                key={p.days}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className={cn(
                  "relative overflow-hidden rounded-lg border p-3.5",
                  p.days === 90 ? "border-alert/40 bg-alert/[0.06]" : "border-border bg-secondary/30",
                )}
              >
                <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">{p.label}</p>
                <p className={cn("mt-1.5 font-display text-lg font-semibold tabular-nums", p.days === 90 ? "text-alert" : "text-flare")}>
                  +{inrCompact(p.incrementalInterest)}
                </p>
                <p className="mt-0.5 font-mono text-[9px] tracking-[0.08em] text-muted-foreground">
                  total {inrCompact(p.interestAccruedFuture)}
                </p>
                {p.topContributors[0] && (
                  <p className="mt-1.5 truncate border-t border-border/40 pt-1.5 text-[10.5px] text-muted-foreground" title={p.topContributors[0].buyer}>
                    top: {p.topContributors[0].number}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* MSEFC clock risk */}
        {(criticalClocks.length > 0 || atRiskClocks.length > 0) && (
          <div className="mt-5">
            <p className="mb-2.5 flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.16em] uppercase text-alert">
              <AlertTriangle className="h-3 w-3" /> MSEFC clock risk · {data.clockRisk.length} active reference{data.clockRisk.length === 1 ? "" : "s"}
            </p>
            <ul className="space-y-1.5">
              {data.clockRisk.slice(0, 4).map((c) => (
                <li key={c.id} className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2",
                  c.critical ? "border-alert/40 bg-alert/[0.06]" : c.atRisk ? "border-flare/30 bg-flare/[0.04]" : "border-border bg-secondary/20",
                )}>
                  <span className={cn("font-mono text-[10px] tracking-[0.08em]", c.critical ? "text-alert" : c.atRisk ? "text-flare" : "text-mint")}>
                    {c.caseNumber}
                  </span>
                  <span className="truncate text-[12px] text-foreground/90">{c.buyer}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="hidden font-mono text-[10px] tabular-nums text-muted-foreground sm:inline">{inrCompact(c.claim)}</span>
                    <span className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] uppercase",
                      c.critical ? "border-alert/40 bg-alert/10 text-alert" : c.atRisk ? "border-flare/40 bg-flare/10 text-flare" : "border-border text-muted-foreground",
                    )}>
                      {c.daysLeft}d left
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 font-mono text-[9px] tracking-[0.1em] text-muted-foreground">
              council must decide within {90} days of filing (§18) · decide by {data.clockRisk[0] ? fmtDate(data.clockRisk[0].decisionBy) : "—"}
            </p>
          </div>
        )}

        {/* opportunity CTA */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.16em] uppercase text-mint">
              <Zap className="h-3 w-3" /> The opportunity
            </p>
            <p className="mt-1 text-[13px] text-foreground/90">
              Recover today and lock in <span className="font-semibold text-mint">{inrCompact(data.totalClaimableNow)}</span> — or let it grow to{" "}
              <span className="font-semibold text-flare">{inrCompact(data.totalClaimableNow + data.ninetyDayBleed)}</span> over 90 days.
            </p>
          </div>
          <a
            href="/console/insights"
            className="inline-flex items-center gap-1.5 rounded-lg bg-mint px-4 h-9 text-[12.5px] font-semibold text-[#04140b] transition-colors hover:bg-[#4df7ae]"
          >
            Get action plan <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function BleedStat({ label, value, tone = "flare" }: { label: string; value: string; tone?: "flare" | "alert" | "muted" }) {
  const color = tone === "alert" ? "text-alert" : tone === "flare" ? "text-flare" : "text-muted-foreground";
  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
      <p className="font-mono text-[8.5px] tracking-[0.14em] uppercase text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-display text-base font-semibold tabular-nums", color)}>{value}</p>
    </div>
  );
}
