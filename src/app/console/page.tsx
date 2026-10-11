"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, FilePlus2, ArrowRight, Scale, Inbox, Radio, Sparkles } from "lucide-react";
import { StatCard, LiveInterest, Bar, PageHead, inrCompact, fmtDate } from "@/components/console/kit";
import { inr } from "@/lib/format";
import { EventRow, DeadlineBadge } from "@/components/console/event-row";
import { CASE_STAGE_META } from "@/lib/domain";
import { cn } from "@/lib/utils";

type Overview = {
  org: { name: string; gstin: string | null; source: string; isDemo: boolean; createdAt: string };
  kpis: {
    invoiceCount: number;
    liveCount: number;
    outstanding: number;
    overdueCount: number;
    overdueAmount: number;
    interestAccrued: number;
    interestPerSecond: number;
    claimable: number;
    recoveredAmount: number;
    recoveredCount: number;
    successFees: number;
    feeRate: number;
    netToSupplier: number;
  };
  pipeline: { key: string; label: string; short: string; count: number; amount: number }[];
  clocks: {
    id: string;
    caseNumber: string;
    stage: string;
    buyer: string;
    invoiceNumber: string;
    claim: number;
    filedOn: string;
    decisionBy: string;
    daysLeft: number;
    hearingOn: string | null;
  }[];
  feed: { id: string; type: string; title: string; detail: string | null; createdAt: string; invoice?: { number: string; id: string } | null }[];
};

export default function ConsoleOverviewPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Overview>({
    queryKey: ["overview"],
    queryFn: async () => (await fetch("/api/overview")).json(),
  });

  const sync = useMutation({
    mutationFn: async () => (await fetch("/api/invoices/sync", { method: "POST" })).json(),
    onSuccess: (res: { synced: number; message?: string }) => {
      if (res.synced > 0) {
        toast.success(`Ingested ${res.synced} invoice${res.synced > 1 ? "s" : ""} from the connected source`);
      } else {
        toast(res.message ?? "Source fully reconciled");
      }
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-secondary/50" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-secondary/50" />
      </div>
    );
  }

  const { kpis, pipeline, clocks, feed, org } = data;
  const maxCount = Math.max(1, ...pipeline.map((p) => p.count));

  return (
    <>
      <PageHead
        kicker={`Recovery engine · live · ${org.source} sync`}
        title={`${org.name.split(" ")[0]}, the machine is watching.`}
        desc="Every invoice is monitored against the 45-day statutory term. The moment a buyer defaults, §16 interest switches on and the pipeline below goes to work — notices, evidence, ODR filing, award, money."
      >
        <button
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 h-10 text-[13px] font-medium transition-colors hover:border-mint/40 hover:text-mint disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", sync.isPending && "animate-spin")} />
          {sync.isPending ? "Syncing…" : "Sync source"}
        </button>
        <Link
          href="/console/invoices"
          className="inline-flex items-center gap-2 rounded-lg bg-mint px-4 h-10 text-[13px] font-semibold text-[#04140b] transition-colors hover:bg-[#4df7ae]"
        >
          <FilePlus2 className="h-4 w-4" />
          Invoices
        </Link>
      </PageHead>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Outstanding principal"
          value={inrCompact(kpis.outstanding)}
          sub={`${kpis.liveCount} live invoices · ${kpis.overdueCount} past the statutory term`}
        />
        <StatCard
          label="§16 interest accrued"
          tone="flare"
          value={<LiveInterest baseInterest={kpis.interestAccrued} perSecond={kpis.interestPerSecond} compact />}
          sub={`Compounding at 3× bank rate, monthly rests — ${kpis.overdueCount} buyer${kpis.overdueCount === 1 ? "" : "s"} paying for the delay`}
        />
        <StatCard
          label="Total claimable"
          tone="mint"
          value={inrCompact(kpis.claimable)}
          sub="Principal + statutory interest, MSEFC-enforceable"
        />
        <StatCard
          label="Recovered"
          tone="mint"
          value={inrCompact(kpis.recoveredAmount)}
          sub={`${kpis.recoveredCount} closed · net to supplier ${inrCompact(kpis.netToSupplier)} · fee ${(kpis.feeRate * 100).toFixed(1)}% ${inrCompact(kpis.successFees)}`}
        />
      </div>

      {/* AI insights teaser */}
      <Link
        href="/console/insights"
        className="group mt-6 flex items-center justify-between gap-4 overflow-hidden rounded-xl border border-mint/25 bg-gradient-to-r from-mint/[0.07] to-transparent p-5 transition-colors hover:border-mint/40"
      >
        <div className="flex items-center gap-3.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-mint/30 bg-mint/10 text-mint">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-mint">AI recovery strategist</p>
            <p className="mt-0.5 font-display text-[15px] font-semibold tracking-tight">Get your prioritised recovery action plan</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">A senior strategist reads this portfolio, prioritises the fastest-compounding claims, and flags concentration risk.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-mint px-4 h-9 text-[12.5px] font-semibold text-[#04140b] transition-transform group-hover:translate-x-0.5">
          Open plan <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Pipeline funnel */}
        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight">Recovery pipeline</h2>
            <Link href="/console/invoices" className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground hover:text-mint">
              open →
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {pipeline.map((p, idx) => (
              <div key={p.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex items-center gap-2.5 text-[13px]">
                    <span className="font-mono text-[10px] tracking-[0.14em] text-mint">{String(idx + 1).padStart(2, "0")}</span>
                    <span className="font-medium">{p.label}</span>
                    {p.count > 0 ? (
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {p.count}
                      </span>
                    ) : null}
                  </p>
                  <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">{inrCompact(p.amount)}</span>
                </div>
                <Bar className="mt-2" pct={(p.count / maxCount) * 100} tone={idx >= 3 ? "mint" : "flare"} />
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-border pt-4 text-[12px] leading-relaxed text-muted-foreground">
            Stage 01 is automatic — invoices ingest and get watched against day 45. Everything from notice onward is
            one click per invoice, with the statutory maths computed for you at every step.
          </p>
        </section>

        {/* 90-day clocks */}
        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight">Statutory clocks</h2>
            <Scale className="h-4 w-4 text-mint" />
          </div>
          {clocks.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 py-10 text-center">
              <Inbox className="h-5 w-5 text-muted-foreground" />
              <p className="mt-3 text-[13px] text-muted-foreground">No active ODR references. File one from any invoice whose evidence pack is sealed.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {clocks.map((c) => (
                <li key={c.id} className="rounded-lg border border-border bg-panel p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[11.5px] tracking-[0.06em] text-mint">{c.caseNumber}</p>
                    <DeadlineBadge daysLeft={c.daysLeft} />
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-medium">{c.buyer}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
                    <span className="font-mono uppercase tracking-[0.08em]">
                      {CASE_STAGE_META[c.stage]?.label ?? c.stage} · claim {inrCompact(c.claim)}
                    </span>
                    <span>decide by {fmtDate(c.decisionBy)}</span>
                  </div>
                  {c.hearingOn ? (
                    <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-flare">
                      hearing {fmtDate(c.hearingOn)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Live feed */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <Radio className="h-4 w-4 text-mint" />
            Machine feed
          </h2>
          <Link href="/console/activity" className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground hover:text-mint">
            full log →
          </Link>
        </div>
        <div className="mt-3 divide-y divide-border/60">
          {feed.slice(0, 8).map((e) => (
            <EventRow
              key={e.id}
              event={e}
              onOpenInvoice={() => {
                qc.setQueryData(["focus-invoice"], e.invoice?.id ?? null);
                window.location.href = "/console/invoices";
              }}
            />
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 border-t border-border pt-4 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
          every entry is timestamped evidence <ArrowRight className="h-3 w-3 text-mint" /> admissible before the council
        </p>
      </section>
    </>
  );
}
