"use client";

import { useEffect, useRef, useState, Component } from "react";
import { inr, formatIndian } from "@/lib/format";
import { STATUS_META } from "@/lib/domain";
import { cn } from "@/lib/utils";

/* ------------------------------ error boundary ----------------------------- */

export class RenderBoundary extends Component<
  { children: React.ReactNode; label?: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[RenderBoundary]", error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-alert/40 bg-alert/[0.06] p-5">
          <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-alert">
            render error {this.props.label ? `· ${this.props.label}` : ""}
          </p>
          <p className="mt-2 font-mono text-[12px] leading-relaxed break-words">{this.state.error.message}</p>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10.5px] leading-relaxed text-muted-foreground">
            {this.state.error.stack?.slice(0, 1200)}
          </pre>
          <button onClick={() => this.setState({ error: null })} className="mt-3 rounded-lg border border-border px-3 h-8 text-[12px]">
            retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------ money helpers ----------------------------- */

/** ₹18,50,000 → ₹18.5 L · ₹1,86,40,000 → ₹1.86 Cr */
export function inrCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.00$/, "")} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.00$/, "")} L`;
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
  return inr(n);
}

export function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function rel(d: string | Date): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ------------------------------ status chips ------------------------------ */

const TONE_CHIP: Record<string, string> = {
  watch: "border-flare/30 bg-flare/[0.07] text-flare",
  flare: "border-flare/35 bg-flare/[0.08] text-flare",
  mint: "border-mint/35 bg-mint/[0.08] text-mint",
  alert: "border-alert/35 bg-alert/[0.08] text-alert",
  done: "border-mint/50 bg-mint/[0.14] text-mint",
  muted: "border-border bg-secondary text-muted-foreground",
};

export function StatusChip({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "muted" as const };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10.5px] tracking-[0.1em] uppercase whitespace-nowrap",
        TONE_CHIP[meta.tone] ?? TONE_CHIP.muted,
        className
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current animate-pulse-dot" />
      {meta.label}
    </span>
  );
}

export function Chip({ tone, children, className }: { tone: keyof typeof TONE_CHIP; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10.5px] tracking-[0.1em] uppercase whitespace-nowrap",
        TONE_CHIP[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** The big rubber-stamp visual used on award / recovered states */
export function Stamp({ label, tone = "mint", className }: { label: string; tone?: "mint" | "flare" | "alert"; className?: string }) {
  const color = tone === "mint" ? "border-mint/70 text-mint" : tone === "flare" ? "border-flare/70 text-flare" : "border-alert/70 text-alert";
  return (
    <span
      className={cn(
        "animate-stamp-in pointer-events-none inline-block rotate-[-8deg] rounded-md border-[2.5px] px-3 py-1 font-display text-sm font-bold tracking-[0.18em] uppercase opacity-90 select-none",
        color,
        className
      )}
    >
      {label}
    </span>
  );
}

/* ---------------------------- live §16 accrual ----------------------------- */

/** Live-ticking statutory interest meter — accrues per second from server state. */
export function LiveInterest({
  baseInterest,
  perSecond,
  className,
  compact = false,
}: {
  baseInterest: number;
  perSecond: number;
  className?: string;
  compact?: boolean;
}) {
  const [extra, setExtra] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const t = setInterval(() => setExtra((Date.now() - startRef.current) / 1000), 1000);
    return () => clearInterval(t);
  }, []);

  const value = baseInterest + perSecond * extra;
  return (
    <span className={cn("tabular-nums", className)} title={`${inr(perSecond * 86400)} accruing per day`}>
      {compact ? inrCompact(value) : inr(Math.round(value))}
    </span>
  );
}

/* -------------------------------- stat cards ------------------------------- */

/** Easing-based count-up from 0 → target on mount (or when target changes). */
export function AnimatedNumber({
  value,
  format = "inr",
  duration = 900,
  decimals = 0,
}: {
  value: number;
  format?: "inr" | "inrCompact" | "plain" | "count";
  duration?: number;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (value - from) * eased;
      setDisplay(current);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const rounded = Math.round(display);
  if (format === "inr") return <span className="tabular-nums">{inr(rounded)}</span>;
  if (format === "inrCompact") return <span className="tabular-nums">{inrCompact(display)}</span>;
  if (format === "count") return <span className="tabular-nums">{rounded.toLocaleString("en-IN")}</span>;
  return <span className="tabular-nums">{formatIndian(display, decimals)}</span>;
}

export function StatCard({
  label,
  value,
  sub,
  tone,
  children,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "mint" | "flare" | "alert" | "plain";
  children?: React.ReactNode;
}) {
  const accent =
    tone === "mint"
      ? "text-mint"
      : tone === "flare"
        ? "text-flare"
        : tone === "alert"
          ? "text-alert"
          : "text-foreground";
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
      <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-foreground">{label}</p>
      <p className={cn("mt-3 font-display text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-tight tabular-nums", accent)}>{value}</p>
      {sub ? <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">{sub}</p> : null}
      {children}
    </div>
  );
}

export function Bar({ pct, tone = "mint", className }: { pct: number; tone?: "mint" | "flare"; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tone === "mint" ? "bg-mint" : "bg-flare")}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

/* ------------------------------- page header ------------------------------- */

export function PageHead({
  kicker,
  title,
  desc,
  children,
}: {
  kicker: string;
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[11px] tracking-[0.26em] uppercase text-mint">{kicker}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">{title}</h1>
        {desc ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{desc}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2.5">{children}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary">
        <Icon className="h-5 w-5 text-mint" />
      </div>
      <p className="mt-5 font-display text-lg font-semibold">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      {children ? <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
    </div>
  );
}

export function KeyVal({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground">{k}</span>
      <span className={cn("text-right text-[13px] text-foreground", mono && "tabular-nums")}>{v}</span>
    </div>
  );
}

export { formatIndian };
