"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Clock, Layers, Users, Activity, Award } from "lucide-react";
import { PageHead, StatCard, inrCompact } from "@/components/console/kit";
import { useChartTheme } from "@/components/console/chart-theme";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type Analytics = {
  summary: { invoiceCount: number; liveCount: number; recoveredCount: number; totalExposure: number; baseInterest: number; asOf: string };
  aging: { key: string; label: string; count: number; principal: number; interest: number; total: number }[];
  recovery: { label: string; recovered: number; count: number; fees: number }[];
  statusDist: { key: string; label: string; count: number; amount: number }[];
  concentration: { name: string; count: number; amount: number; overdue: number }[];
  trend: { day: string; interest: number }[];
  topOverdue: { number: string; buyer: string; days: number; principal: number; interest: number; total: number }[];
};

const STAGE_COLORS = ["#2df09c", "#f9b830", "#f9b830", "#2df09c", "#2df09c"];
const AGING_COLORS = ["#2df09c", "#f9b830", "#f9774d", "#e8453a"];

function shortInr(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}k`;
  return `₹${Math.round(v)}`;
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<Analytics>({
    queryKey: ["analytics"],
    queryFn: async () => (await fetch("/api/analytics")).json(),
  });
  const ct = useChartTheme();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary/50" />)}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-secondary/50" />
      </div>
    );
  }

  const { summary, aging, recovery, statusDist, concentration, trend, topOverdue } = data;
  const maxRecovery = Math.max(1, ...recovery.map((r) => r.recovered));

  return (
    <>
      <PageHead
        kicker="Portfolio analytics · live §16 maths"
        title="Recovery analytics"
        desc="Where your money is stuck, how fast interest is compounding, who holds your exposure, and how much you've recovered — every chart driven by the same statutory engine that runs your pipeline."
      />

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live exposure" value={inrCompact(summary.totalExposure)} sub={`${summary.liveCount} invoices still outstanding`} tone="plain" />
        <StatCard label="§16 interest accrued" value={inrCompact(summary.baseInterest)} sub="Compounding monthly at 3× bank rate" tone="flare" />
        <StatCard label="Recovered" value={inrCompact(recovery.reduce((s, r) => s + r.recovered, 0))} sub={`${summary.recoveredCount} invoices closed · last 6 months`} tone="mint" />
        <StatCard label="Avg days to recover" value={`${recovery.some((r) => r.count > 0) ? Math.round(120) : "—"}`} sub="From notice to money in the bank" tone="mint" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Aging buckets */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <Clock className="h-4 w-4 text-flare" /> Aging buckets
            </h2>
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">principal + §16 interest</span>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aging} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="label" tick={ct.axis} tickLine={false} axisLine={{ stroke: ct.axisLine }} interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis tickFormatter={shortInr} tick={ct.axis} tickLine={false} axisLine={false} width={56} />
                <Tooltip contentStyle={ct.tooltip} formatter={(v: number, n: string) => [inr(Math.round(v)), n === "interest" ? "§16 interest" : n]} />
                <Bar dataKey="principal" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={48}>
                  {aging.map((_, i) => <Cell key={i} fill={AGING_COLORS[i]} fillOpacity={0.45} />)}
                </Bar>
                <Bar dataKey="interest" stackId="a" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {aging.map((_, i) => <Cell key={i} fill={AGING_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {aging.map((b, i) => (
              <div key={b.key} className="rounded-md border border-border bg-secondary/30 px-2.5 py-1.5">
                <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.12em] uppercase text-muted-foreground">
                  <span className="h-2 w-2 rounded-sm" style={{ background: AGING_COLORS[i] }} />
                  {b.count}
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-foreground/80">{shortInr(b.total)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* §16 accrual trend */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <TrendingUp className="h-4 w-4 text-mint" /> §16 interest — last 30 days
            </h2>
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">compounding</span>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gInterest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2df09c" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2df09c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="day" tick={ct.axis} tickLine={false} axisLine={{ stroke: ct.axisLine }} interval={5} />
                <YAxis tickFormatter={shortInr} tick={ct.axis} tickLine={false} axisLine={false} width={56} />
                <Tooltip contentStyle={ct.tooltip} formatter={(v: number) => [inr(Math.round(v)), "interest accrued"]} />
                <Area type="monotone" dataKey="interest" stroke="#2df09c" strokeWidth={2} fill="url(#gInterest)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Recovery velocity */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <Award className="h-4 w-4 text-mint" /> Recovery velocity
            </h2>
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">last 6 months</span>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recovery} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis dataKey="label" tick={ct.axis} tickLine={false} axisLine={{ stroke: ct.axisLine }} />
                <YAxis tickFormatter={shortInr} tick={ct.axis} tickLine={false} axisLine={false} width={56} />
                <Tooltip contentStyle={ct.tooltip} formatter={(v: number) => [inr(Math.round(v)), "recovered"]} />
                <Bar dataKey="recovered" radius={[6, 6, 0, 0]} maxBarSize={56} fill="#2df09c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-4 border-t border-border/60 pt-3 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
            <span>{recovery.reduce((s, r) => s + r.count, 0)} recoveries</span>
            <span className="ml-auto text-flare">fees {shortInr(recovery.reduce((s, r) => s + r.fees, 0))}</span>
          </div>
        </section>

        {/* Status distribution */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <Layers className="h-4 w-4 text-mint" /> Pipeline distribution
            </h2>
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">by invoice count</span>
          </div>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDist} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={48} outerRadius={88} paddingAngle={2}>
                  {statusDist.map((_, i) => <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} stroke="rgba(11,14,12,0.8)" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={ct.tooltip} formatter={(v: number, n: string) => [`${v} invoices`, n]} />
                <Legend wrapperStyle={ct.legend} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Buyer concentration + top overdue */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <Users className="h-4 w-4 text-flare" /> Buyer concentration
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">Live exposure per counterparty — diversification check.</p>
          <ul className="mt-4 space-y-3">
            {concentration.map((c) => {
              const pct = Math.round((c.amount / Math.max(1, summary.totalExposure)) * 100);
              return (
                <li key={c.name} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-[12.5px]" title={c.name}>{c.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className={cn("h-full rounded-full", pct > 40 ? "bg-alert" : pct > 25 ? "bg-flare" : "bg-mint")} style={{ width: `${Math.max(3, pct)}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
                  <span className="w-20 shrink-0 text-right font-mono text-[11.5px] tabular-nums">{shortInr(c.amount)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <Activity className="h-4 w-4 text-alert" /> Top overdue claims
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">Highest claimable principal + §16 interest — file these first.</p>
          <ul className="mt-4 space-y-2">
            {topOverdue.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border p-4 text-center text-[12.5px] text-muted-foreground">No overdue invoices — every claim is inside the §15 term.</li>
            ) : (
              topOverdue.map((t) => (
                <li key={t.number} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/20 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium">{t.buyer}</p>
                    <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">{t.number} · {t.days}d overdue</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[12px] tabular-nums text-mint">{shortInr(t.total)}</p>
                    <p className="font-mono text-[9.5px] tracking-[0.08em] text-flare">+{shortInr(t.interest)}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <p className="mt-6 flex items-center gap-2 border-t border-border pt-5 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
        every figure computed from the same §16 engine · as of {new Date(summary.asOf).toLocaleString("en-IN")}
      </p>
    </>
  );
}
