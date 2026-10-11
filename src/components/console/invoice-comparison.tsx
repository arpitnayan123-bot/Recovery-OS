"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { GitCompare, X, TrendingUp, Clock, IndianRupee } from "lucide-react";
import { inrCompact, StatusChip } from "@/components/console/kit";
import { useChartTheme } from "@/components/console/chart-theme";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type ComparisonItem = {
  id: string;
  number: string;
  buyer: string;
  gstin: string | null;
  amount: number;
  status: string;
  stageIndex: number;
  daysOverdue: number;
  interestNow: number;
  totalNow: number;
  perDay: number;
  ninetyDayBleed: number;
  recovered: boolean;
  recoveredAt: string | null;
  curve: { day: number; interest: number; total: number }[];
};

const COLORS = ["#2df09c", "#f5b02e", "#f9774d", "#7dd3fc"];

function shortInr(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}k`;
  return `₹${Math.round(v)}`;
}

export function InvoiceComparison({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const ct = useChartTheme();
  const { data, isLoading } = useQuery<{ comparison: ComparisonItem[] }>({
    queryKey: ["compare", ids.join(",")],
    queryFn: async () => (await fetch(`/api/invoices/compare?ids=${ids.join(",")}`)).json(),
    enabled: ids.length >= 2,
  });

  // merge curves into a single dataset for the multi-line chart
  const chartData = (data?.comparison ?? []).flatMap((item, idx) =>
    item.curve.map((p) => ({
      day: p.day,
      [`${item.number}`]: p.interest,
      _color: COLORS[idx % COLORS.length],
    })),
  );
  // re-aggregate by day
  const byDay = new Map<number, Record<string, number>>();
  for (const item of data?.comparison ?? []) {
    for (const p of item.curve) {
      const row = byDay.get(p.day) ?? { day: p.day };
      row[item.number] = p.interest;
      byDay.set(p.day, row);
    }
  }
  const merged = [...byDay.values()].sort((a, b) => a.day - b.day);

  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-4xl rounded-xl border border-border bg-[#0b0e0c] p-6">
          <div className="h-6 w-48 animate-pulse rounded bg-secondary/60" />
          <div className="mt-5 h-64 animate-pulse rounded-lg bg-secondary/40" />
        </div>
      </div>
    );
  }

  const items = data.comparison;
  const maxBleed = Math.max(...items.map((i) => i.ninetyDayBleed));
  const winner = items.find((i) => i.ninetyDayBleed === maxBleed && !i.recovered);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.2, 1, 0.3, 1] }}
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-[#0b0e0c] shadow-2xl"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-mint/30 bg-mint/10 text-mint">
              <GitCompare className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">Invoice comparison</h2>
              <p className="text-[11.5px] text-muted-foreground">{items.length} invoices · 90-day §16 projection · side-by-side</p>
            </div>
          </div>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5" style={{ scrollbarWidth: "thin" }}>
          {/* chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={merged} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="day" tickFormatter={(d) => d === 0 ? "now" : `+${d}d`} tick={ct.axis} tickLine={false} axisLine={{ stroke: ct.axisLine }} />
                <YAxis tickFormatter={shortInr} tick={ct.axis} tickLine={false} axisLine={false} width={52} />
                <Tooltip contentStyle={ct.tooltip} formatter={(v: number, n: string) => [shortInr(v), `${n} interest`]} labelFormatter={(l) => `day ${l}`} />
                <Legend wrapperStyle={ct.legend} iconType="plainline" />
                {items.map((item, idx) => (
                  <Line
                    key={item.id}
                    type="monotone"
                    dataKey={item.number}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={item.id === winner?.id ? 2.5 : 1.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* winner callout */}
          {winner && (
            <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-alert/30 bg-alert/[0.06] px-3.5 py-2.5">
              <TrendingUp className="h-4 w-4 shrink-0 text-alert" />
              <p className="text-[12.5px] text-foreground/90">
                <span className="font-semibold text-alert">{winner.number}</span> ({winner.buyer}) is bleeding the fastest —{" "}
                <span className="font-semibold text-alert">{inr(winner.ninetyDayBleed)}</span> over 90 days. Recover it first.
              </p>
            </div>
          )}

          {/* side-by-side metric cards */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-${items.length > 2 ? 3 : 2}">
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={cn(
                  "rounded-lg border p-4",
                  item.id === winner?.id ? "border-alert/40 bg-alert/[0.04]" : "border-border bg-secondary/20",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                    <span className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground">{item.number}</span>
                  </span>
                  <StatusChip status={item.status} />
                </div>
                <p className="mt-2 truncate text-[13px] font-medium" title={item.buyer}>{item.buyer}</p>
                <div className="mt-3 space-y-1.5">
                  <Metric icon={<IndianRupee className="h-3 w-3" />} label="Principal" value={inr(item.amount)} />
                  <Metric icon={<TrendingUp className="h-3 w-3" />} label="§16 accrued" value={inr(item.interestNow)} tone="flare" />
                  <Metric icon={<Clock className="h-3 w-3" />} label="90-day bleed" value={inr(item.ninetyDayBleed)} tone={item.id === winner?.id ? "alert" : "muted"} />
                  <Metric icon={<IndianRupee className="h-3 w-3" />} label="Total claimable" value={inrCompact(item.totalNow)} tone="mint" />
                </div>
                <p className="mt-2 border-t border-border/60 pt-2 font-mono text-[9.5px] tracking-[0.08em] uppercase text-muted-foreground">
                  {item.daysOverdue > 0 ? `${item.daysOverdue}d overdue · +${inr(item.perDay)}/day` : "within term"}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="border-t border-border px-5 py-3 font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted-foreground">
          §16 interest compounds monthly at 3× bank rate · projections assume no recovery action
        </div>
      </motion.div>
    </div>
  );
}

function Metric({ icon, label, value, tone = "plain" }: { icon: React.ReactNode; label: string; value: string; tone?: "plain" | "flare" | "alert" | "mint" | "muted" }) {
  const color = tone === "flare" ? "text-flare" : tone === "alert" ? "text-alert" : tone === "mint" ? "text-mint" : tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.1em] uppercase text-muted-foreground">
        {icon} {label}
      </span>
      <span className={cn("font-mono text-[12px] tabular-nums", color)}>{value}</span>
    </div>
  );
}
