"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2, Mail, Phone, MapPin, Calendar, ShieldCheck, Zap, TrendingUp,
  Award, FileText, Scale, Activity, Database, Bell, CheckCircle2, Globe, Hash,
} from "lucide-react";
import { PageHead, StatCard, Bar, inrCompact, fmtDate, StatusChip } from "@/components/console/kit";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

type Profile = {
  org: {
    id: string; name: string; contact: string | null; gstin: string | null;
    city: string | null; source: string; isDemo: boolean; createdAt: string;
  };
  user: { id: string; email: string; name: string | null; phone: string | null; createdAt: string } | null;
  engine: { status: "on" | "idle"; label: string; lastEvent: string; liveInvoices: number; monitoring: boolean };
  kpis: {
    invoiceCount: number; liveCount: number; recoveredCount: number; outstanding: number;
    overdueCount: number; overdueAmount: number; interestAccrued: number; interestPerSecond: number;
    claimable: number; recoveredAmount: number; successFees: number; feeRate: number; netToSupplier: number;
  };
  pipeline: { key: string; label: string; short: string; count: number; amount: number }[];
  topBuyers: { id: string; name: string; gstin: string | null; city: string | null; liveCount: number; totalInvoices: number; exposure: number }[];
  digest: {
    emailEnabled: boolean; whatsappEnabled: boolean; smsEnabled: boolean; cadence: string;
    alertOverdue: boolean; alertClockRisk: boolean; alertForecast: boolean; forecastThreshold: number;
  };
  activity: { totalEvents: number; importBatches: number; auditEntries: number; activeCases: number; awardedCases: number };
  asOf: string;
};

const SOURCE_LABEL: Record<string, string> = {
  tally: "Tally Prime", zoho: "Zoho Books", csv: "CSV / Excel", manual: "Manual entry",
};

export default function ProfilePage() {
  const { data, isLoading } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => (await fetch("/api/profile")).json(),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-2xl bg-secondary/50" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-secondary/50" />)}
        </div>
      </div>
    );
  }

  const { org, user, engine, kpis, pipeline, topBuyers, digest, activity } = data;
  const engineOn = engine.status === "on";
  const maxPipeline = Math.max(1, ...pipeline.map((p) => p.count));
  const initials = (user?.name || org.name).split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();

  return (
    <>
      <PageHead
        kicker="Consumer profile · Recovery OS workspace"
        title="Profile"
        desc="Your organisation, your account, and the live status of the recovery engine — everything Recovery OS knows about this workspace in one place."
      />

      {/* ===== Hero header ===== */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border border-border bg-card"
      >
        {/* gradient backdrop */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_0%_0%,rgba(45,240,156,0.10),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(70%_60%_at_30%_30%,black,transparent)]" />

        <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
          {/* left: avatar + identity */}
          <div className="flex items-start gap-4">
            {/* avatar */}
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-mint/30 bg-gradient-to-br from-mint/15 to-mint/[0.03] font-display text-2xl font-bold text-mint">
                {initials}
              </div>
              {/* engine status dot */}
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card",
                  engineOn ? "bg-mint" : "bg-muted-foreground",
                )}
                title={engine.label}
              >
                <Zap className={cn("h-3.5 w-3.5", engineOn ? "text-[#04140b]" : "text-background")} />
              </span>
            </div>

            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{org.name}</h1>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-muted-foreground">
                <Hash className="h-3 w-3" /> {org.gstin ?? "GSTIN —"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* Recovery OS status badge */}
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase",
                  engineOn
                    ? "border-mint/40 bg-mint/[0.1] text-mint"
                    : "border-border bg-secondary text-muted-foreground",
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", engineOn ? "bg-mint animate-pulse-dot" : "bg-muted-foreground")} />
                  {engineOn ? "Recovery OS · on" : "Recovery OS · idle"}
                </span>
                {org.isDemo && (
                  <span className="rounded-full border border-flare/30 bg-flare/[0.08] px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-flare">
                    demo workspace
                  </span>
                )}
                <span className="rounded-full border border-border bg-secondary px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
                  {SOURCE_LABEL[org.source] ?? org.source}
                </span>
              </div>
            </div>
          </div>

          {/* right: live KPI summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[28rem]">
            <MiniStat label="Live invoices" value={String(kpis.liveCount)} icon={FileText} tone="plain" />
            <MiniStat label="Claimable" value={inrCompact(kpis.claimable)} icon={TrendingUp} tone="mint" />
            <MiniStat label="Recovered" value={inrCompact(kpis.recoveredAmount)} icon={Award} tone="mint" />
            <MiniStat label="§16 accruing" value={inrCompact(kpis.interestAccrued)} icon={Zap} tone="flare" />
          </div>
        </div>

        {/* engine status strip */}
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/60 px-6 py-3 sm:px-8">
          <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
            <ShieldCheck className={cn("h-3.5 w-3.5", engineOn ? "text-mint" : "text-muted-foreground")} />
            {engine.label}
          </span>
          <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-mint" />
            {activity.totalEvents} events tracked
          </span>
          <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            live since {fmtDate(org.createdAt)}
          </span>
          <span className="ml-auto font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
            as of {new Date(data.asOf).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </motion.section>

      {/* ===== Two-column: organisation + account ===== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Organisation details */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
            <Building2 className="h-4 w-4 text-mint" /> Organisation
          </h2>
          <div className="mt-4 space-y-3">
            <DetailRow icon={<Building2 className="h-3.5 w-3.5" />} label="Supplier name" value={org.name} />
            <DetailRow icon={<Hash className="h-3.5 w-3.5" />} label="GSTIN" value={org.gstin ?? "—"} mono />
            <DetailRow icon={<MapPin className="h-3.5 w-3.5" />} label="City" value={org.city ?? "—"} />
            <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="Contact" value={org.contact ?? "—"} />
            <DetailRow icon={<Database className="h-3.5 w-3.5" />} label="Data source" value={SOURCE_LABEL[org.source] ?? org.source} />
            <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Live since" value={fmtDate(org.createdAt)} />
          </div>
        </section>

        {/* Account details */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
            <ShieldCheck className="h-4 w-4 text-mint" /> Account
          </h2>
          {user ? (
            <div className="mt-4 space-y-3">
              <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={user.email} mono />
              {user.name && <DetailRow icon={<Building2 className="h-3.5 w-3.5" />} label="Name" value={user.name} />}
              {user.phone && <DetailRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={user.phone} mono />}
              <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Member since" value={fmtDate(user.createdAt)} />
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-mint/25 bg-mint/[0.04] px-3 py-2.5">
                <Lock className="h-3.5 w-3.5 text-mint" />
                <span className="text-[11.5px] text-muted-foreground">bcrypt-hashed · db-backed · revocable session</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/20 p-5 text-center">
              <User2 className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-[13px] text-muted-foreground">No account linked to this workspace.</p>
              <p className="mt-1 text-[11.5px] text-muted-foreground/70">Create an account to keep your recovery pipeline across sessions.</p>
              <Link href="/signup" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-mint px-4 h-9 text-[12.5px] font-semibold text-[#04140b] transition-colors hover:bg-[#4df7ae]">
                <User2 className="h-4 w-4" /> Create account
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* ===== Recovery engine status ===== */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Zap className={cn("h-4 w-4", engineOn ? "text-mint" : "text-muted-foreground")} /> Recovery engine
        </h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {engineOn
            ? `Recovery OS is actively monitoring ${kpis.liveCount} live invoice${kpis.liveCount === 1 ? "" : "s"} against the 45-day statutory term. Every default triggers §16 interest and the pipeline below.`
            : "No live invoices — the recovery engine is idle. Add or import invoices to switch it on."}
        </p>

        {/* pipeline distribution */}
        <div className="mt-5 space-y-3">
          {pipeline.map((p, idx) => (
            <div key={p.key}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="flex items-center gap-2 text-[12.5px]">
                  <span className="font-mono text-[9.5px] tracking-[0.14em] text-mint">{String(idx + 1).padStart(2, "0")}</span>
                  <span className="font-medium">{p.label}</span>
                  {p.count > 0 && (
                    <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground">{p.count}</span>
                  )}
                </p>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{inrCompact(p.amount)}</span>
              </div>
              <Bar className="mt-1.5" pct={(p.count / maxPipeline) * 100} tone={idx >= 3 ? "mint" : "flare"} />
            </div>
          ))}
        </div>
      </section>

      {/* ===== KPI grid ===== */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Outstanding principal" value={inrCompact(kpis.outstanding)} sub={`${kpis.liveCount} live · ${kpis.overdueCount} overdue`} />
        <StatCard label="§16 interest accrued" tone="flare" value={inrCompact(kpis.interestAccrued)} sub={`${kpis.overdueCount} buyer${kpis.overdueCount === 1 ? "" : "s"} paying for the delay`} />
        <StatCard label="Total claimable" tone="mint" value={inrCompact(kpis.claimable)} sub="Principal + statutory interest" />
        <StatCard label="Recovered" tone="mint" value={inrCompact(kpis.recoveredAmount)} sub={`${kpis.recoveredCount} closed · net ${inrCompact(kpis.netToSupplier)} · fee ${(kpis.feeRate * 100).toFixed(1)}%`} />
      </div>

      {/* ===== Top buyers + Digest + Activity ===== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Top buyers */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
            <Building2 className="h-4 w-4 text-flare" /> Top counterparty exposure
          </h2>
          {topBuyers.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-center text-[12.5px] text-muted-foreground">No buyers on record yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {topBuyers.map((b, i) => (
                <li key={b.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 px-3 py-2.5">
                  <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium" title={b.name}>{b.name}</p>
                    <p className="font-mono text-[9.5px] tracking-[0.08em] text-muted-foreground">
                      {b.gstin ?? "GSTIN —"} · {b.liveCount} live / {b.totalInvoices} total
                    </p>
                  </div>
                  <span className="font-mono text-[12px] tabular-nums text-mint">{inrCompact(b.exposure)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Digest + Activity */}
        <div className="space-y-6">
          {/* Digest preferences summary */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
                <Bell className="h-4 w-4 text-mint" /> Alert preferences
              </h2>
              <Link href="/console/settings" className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground hover:text-mint">
                edit →
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ChannelChip on={digest.emailEnabled} label="Email" icon={Mail} />
              <ChannelChip on={digest.whatsappEnabled} label="WhatsApp" icon={Globe} />
              <ChannelChip on={digest.smsEnabled} label="SMS" icon={Phone} />
            </div>
            <div className="mt-3 space-y-1.5">
              <AlertRow on={digest.alertOverdue} label="Invoice overdue alerts" />
              <AlertRow on={digest.alertClockRisk} label="MSEFC clock-risk alerts" />
              <AlertRow on={digest.alertForecast} label="Forecast digest" />
            </div>
            <p className="mt-3 border-t border-border/60 pt-2 font-mono text-[9.5px] tracking-[0.1em] uppercase text-muted-foreground">
              cadence: {digest.cadence} · threshold ₹{digest.forecastThreshold.toLocaleString("en-IN")}/day
            </p>
          </section>

          {/* Activity summary */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
              <Activity className="h-4 w-4 text-mint" /> Workspace activity
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ActivityStat label="Events tracked" value={activity.totalEvents} icon={Activity} />
              <ActivityStat label="Import batches" value={activity.importBatches} icon={Database} />
              <ActivityStat label="Audit entries" value={activity.auditEntries} icon={ShieldCheck} />
              <ActivityStat label="Active ODR cases" value={activity.activeCases} icon={Scale} />
            </div>
            {activity.awardedCases > 0 && (
              <p className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-2 text-[11.5px] text-mint">
                <Award className="h-3.5 w-3.5" /> {activity.awardedCases} case{activity.awardedCases === 1 ? "" : "s"} awarded
              </p>
            )}
          </section>
        </div>
      </div>

      <p className="mt-6 flex items-center gap-2 border-t border-border pt-5 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-mint" /> profile synced from live data · §16 interest computed, not guessed
      </p>
    </>
  );
}

/* ----------------------------- small components ----------------------------- */

function MiniStat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: "plain" | "mint" | "flare" }) {
  const color = tone === "mint" ? "text-mint" : tone === "flare" ? "text-flare" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
      <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className={cn("mt-1.5 font-display text-[15px] font-semibold tabular-nums", color)}>{value}</p>
    </div>
  );
}

function DetailRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
        {icon} {label}
      </span>
      <span className={cn("text-right text-[13px] text-foreground", mono && "font-mono tabular-nums")}>{value}</span>
    </div>
  );
}

function ChannelChip({ on, label, icon: Icon }: { on: boolean; label: string; icon: any }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
      on ? "border-mint/40 bg-mint/[0.08] text-mint" : "border-border bg-secondary/40 text-muted-foreground",
    )}>
      <Icon className="h-3 w-3" />
      {label}
      <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-mint" : "bg-muted-foreground/40")} />
    </span>
  );
}

function AlertRow({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] uppercase",
        on ? "border-mint/30 bg-mint/[0.06] text-mint" : "border-border text-muted-foreground/60",
      )}>
        {on ? "on" : "off"}
      </span>
    </div>
  );
}

function ActivityStat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2.5">
      <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Lock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function User2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}
