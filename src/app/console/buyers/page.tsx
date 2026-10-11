"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, ShieldAlert, TrendingDown } from "lucide-react";
import { PageHead, EmptyState, Bar, fmtDate, inrCompact } from "@/components/console/kit";
import { BuyerDiligence } from "@/components/console/buyer-diligence";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type BuyerRow = {
  id: string;
  name: string;
  gstin: string | null;
  invoiceCount: number;
  liveCount: number;
  overdueCount: number;
  avgDaysLate: number;
  score: number;
  label: string;
  tone: "mint" | "flare" | "alert";
  exposure: number;
  recovered: number;
  onWatchlist: boolean;
};

export default function BuyersPage() {
  const { data, isLoading } = useQuery<{ buyers: BuyerRow[] }>({
    queryKey: ["buyers"],
    queryFn: async () => (await fetch("/api/buyers")).json(),
  });

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-secondary/50" />;
  }

  const { buyers } = data;
  const maxExposure = Math.max(1, ...buyers.map((b) => b.exposure));

  return (
    <>
      <PageHead
        kicker="Counterparty intelligence"
        title="Buyer risk index"
        desc="Payment behaviour across your ledger, scored 0–100. Chronic late payers are flagged for watchlist — the same intelligence powers Compliance OS, our buyer-side product for enterprises that must stay off the government's delayed-payment blacklist."
      />

      {buyers.length === 0 ? (
        <EmptyState icon={Building2} title="No buyers yet" body="Buyers appear here automatically as invoices are ingested and tracked." />
      ) : (
        <div className="space-y-3.5">
          {buyers.map((b) => (
            <article key={b.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-display text-[15.5px] font-semibold">{b.name}</h2>
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.14em] uppercase",
                        b.tone === "mint" && "border-mint/35 bg-mint/[0.08] text-mint",
                        b.tone === "flare" && "border-flare/35 bg-flare/[0.08] text-flare",
                        b.tone === "alert" && "border-alert/35 bg-alert/[0.08] text-alert"
                      )}
                    >
                      {b.label}
                    </span>
                    {b.onWatchlist ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-alert/30 bg-alert/[0.07] px-2 py-0.5 font-mono text-[9.5px] tracking-[0.12em] uppercase text-alert">
                        <ShieldAlert className="h-3 w-3" /> watchlist
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-mono text-[10.5px] tracking-[0.08em] text-muted-foreground">
                    {b.gstin ?? "GSTIN —"} · {b.invoiceCount} invoices · {b.overdueCount} currently overdue
                    {b.avgDaysLate > 0 ? ` · avg ${b.avgDaysLate}d late` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("font-display text-2xl font-semibold tabular-nums", b.score >= 75 ? "text-mint" : b.score >= 45 ? "text-flare" : "text-alert")}>
                    {b.score}
                  </p>
                  <p className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">risk score</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">
                    <TrendingDown className="h-3 w-3" /> live exposure (P + §16)
                  </p>
                  <p className="mt-1.5 font-display text-[16px] font-semibold tabular-nums">{inr(b.exposure)}</p>
                  <Bar className="mt-2" pct={(b.exposure / maxExposure) * 100} tone={b.tone === "alert" ? "flare" : "mint"} />
                </div>
                <div>
                  <p className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">recovered via Recovery OS</p>
                  <p className="mt-1.5 font-display text-[16px] font-semibold tabular-nums text-mint">{b.recovered > 0 ? inr(b.recovered) : "—"}</p>
                </div>
                <div>
                  <p className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">statutory posture</p>
                  <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
                    {b.overdueCount === 0
                      ? "Inside terms — no §16 exposure."
                      : `Paying ${b.avgDaysLate || "several"} days late on average — §16 interest compounding at 3× bank rate.`}
                  </p>
                </div>
              </div>

              <BuyerDiligence buyerId={b.id} buyerName={b.name} />
            </article>
          ))}
        </div>
      )}
    </>
  );
}
