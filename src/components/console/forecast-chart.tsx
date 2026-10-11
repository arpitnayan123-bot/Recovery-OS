"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Series = { day: number; label: string; interest: number; total: number };

type ForecastData = {
  series: Series[];
  ninetyDayBleed: number;
  perDay: number;
  totalClaimableNow: number;
};

const tooltipStyle = {
  background: "rgba(11,14,12,0.95)",
  border: "1px solid rgba(45,240,156,0.22)",
  borderRadius: "8px",
  color: "#ecefe9",
  fontFamily: "var(--font-inter)",
  fontSize: "12px",
  padding: "8px 12px",
};
const axisStyle = { fontSize: 10, fill: "rgba(236,239,233,0.55)", fontFamily: "var(--font-mono)" };

function shortInr(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}k`;
  return `₹${Math.round(v)}`;
}

export function ForecastChart({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useQuery<ForecastData>({
    queryKey: ["forecast"],
    queryFn: async () => (await fetch("/api/forecast")).json(),
    staleTime: 30_000,
  });

  if (isLoading || !data || data.series.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="h-5 w-48 animate-pulse rounded bg-secondary/60" />
        <div className={cn("mt-4 animate-pulse rounded-lg bg-secondary/40", compact ? "h-40" : "h-56")} />
      </section>
    );
  }

  const now = data.series[0];
  const day90 = data.series[data.series.length - 1];
  const delta = day90.interest - now.interest;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-xl border border-border bg-card p-5"
    >
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.18em] uppercase text-flare">
            <TrendingUp className="h-3.5 w-3.5" /> §16 accrual curve · 90-day projection
          </p>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            Interest compounds at 3× bank rate, monthly rests. Acting today locks in{" "}
            <span className="font-semibold text-mint">{shortInr(data.totalClaimableNow)}</span>; waiting 90 days lets it grow to{" "}
            <span className="font-semibold text-alert">{shortInr(day90.total)}</span>.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-display text-xl font-semibold tabular-nums text-alert">+{shortInr(delta)}</p>
            <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">90-day bleed</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="font-display text-xl font-semibold tabular-nums text-flare">{shortInr(data.perDay)}</p>
            <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">per day</p>
          </div>
        </div>
      </div>

      {/* chart */}
      <div className={cn("mt-5 w-full", compact ? "h-40" : "h-56")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gForecastInterest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f9774d" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#f9774d" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gForecastTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2df09c" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#2df09c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(236,239,233,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={{ stroke: "rgba(236,239,233,0.1)" }} interval={3} />
            <YAxis tickFormatter={shortInr} tick={axisStyle} tickLine={false} axisLine={false} width={52} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, n: string) => [shortInr(v), n === "interest" ? "§16 interest" : "total claimable"]}
              labelFormatter={(l) => `day ${l}`}
            />
            <Area type="monotone" dataKey="total" stroke="#2df09c" strokeWidth={1.5} fill="url(#gForecastTotal)" />
            <Area type="monotone" dataKey="interest" stroke="#f9774d" strokeWidth={2} fill="url(#gForecastInterest)" />
            <ReferenceLine x="now" stroke="rgba(45,240,156,0.3)" strokeDasharray="2 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* legend */}
      <div className="mt-3 flex items-center gap-5 border-t border-border/60 pt-3 font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-[#f9774d]" /> §16 interest
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-[#2df09c]/40" /> total claimable (principal + interest)
        </span>
        <span className="ml-auto">act today → {shortInr(data.totalClaimableNow)} · wait 90d → {shortInr(day90.total)}</span>
      </div>
    </motion.section>
  );
}
