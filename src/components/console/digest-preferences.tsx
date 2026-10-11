"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MessageSquare, Smartphone, Bell, Clock, TrendingUp, Award, Sparkles, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Prefs = {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  alertOverdue: boolean;
  alertClockRisk: boolean;
  alertForecast: boolean;
  alertRecovery: boolean;
  alertInsight: boolean;
  forecastThreshold: number;
  cadence: "instant" | "daily" | "weekly";
};

const CHANNELS = [
  { key: "emailEnabled", label: "Email", desc: "Deliver to the registered inbox", icon: Mail },
  { key: "whatsappEnabled", label: "WhatsApp", desc: "Business API (coming soon)", icon: MessageSquare },
  { key: "smsEnabled", label: "SMS", desc: "Short text for critical alerts", icon: Smartphone },
] as const;

const ALERTS = [
  { key: "alertOverdue", label: "Invoice overdue", desc: "An invoice crosses the §15 45-day term", icon: Clock, tone: "flare" },
  { key: "alertClockRisk", label: "MSEFC clock risk", desc: "A case is ≤14 days from the §18 decision deadline", icon: Bell, tone: "alert" },
  { key: "alertForecast", label: "Forecast digest", desc: "Weekly cost-of-inaction summary", icon: TrendingUp, tone: "mint" },
  { key: "alertRecovery", label: "Money recovered", desc: "A receipt lands + fee settled", icon: Award, tone: "mint" },
  { key: "alertInsight", label: "AI insight ready", desc: "A new recovery action plan is generated", icon: Sparkles, tone: "mint" },
] as const;

const CADENCES = [
  { key: "instant", label: "Instant", desc: "As it happens" },
  { key: "daily", label: "Daily", desc: "One digest at 9am" },
  { key: "weekly", label: "Weekly", desc: "Monday morning roll-up" },
] as const;

export function DigestPreferences() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ prefs: Prefs }>({
    queryKey: ["digest"],
    queryFn: async () => (await fetch("/api/digest")).json(),
  });
  const [local, setLocal] = useState<Prefs | null>(null);
  const prefs = local ?? data?.prefs ?? null;

  const save = useMutation({
    mutationFn: async (patch: Partial<Prefs>) => {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Failed to save");
      return d;
    },
    onSuccess: (d) => {
      setLocal(d.prefs);
      toast.success("Digest preferences saved.");
      qc.invalidateQueries({ queryKey: ["digest"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testSend = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/digest/test", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Test failed");
      return d;
    },
    onSuccess: (d) => toast.success(d.message),
    onError: (e: Error) => toast.error(e.message),
  });

  const update = (patch: Partial<Prefs>) => {
    if (!prefs) return;
    setLocal({ ...prefs, ...patch });
    save.mutate(patch);
  };

  if (isLoading || !prefs) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="h-5 w-40 animate-pulse rounded bg-secondary/60" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-secondary/40" />)}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
        <Bell className="h-4 w-4 text-mint" /> Digest preferences
      </h2>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Choose which events trigger an alert and which channel delivers them. Ties into the reminder engine.
      </p>

      {/* channels */}
      <div className="mt-4">
        <p className="mb-2 font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">Delivery channels</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            const on = prefs[c.key];
            return (
              <button
                key={c.key}
                onClick={() => update({ [c.key]: !on } as Partial<Prefs>)}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
                  on ? "border-mint/40 bg-mint/[0.06]" : "border-border bg-secondary/30 hover:border-mint/30",
                )}
              >
                <span className={cn("mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border", on ? "border-mint/30 bg-mint/10 text-mint" : "border-border text-muted-foreground")}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-medium">
                    {c.label}
                    <span className={cn("ml-auto h-2 w-2 rounded-full", on ? "bg-mint animate-pulse-dot" : "bg-muted-foreground/30")} />
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{c.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* alerts */}
      <div className="mt-5">
        <p className="mb-2 font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">Alert triggers</p>
        <div className="space-y-1.5">
          {ALERTS.map((a) => {
            const Icon = a.icon;
            const on = prefs[a.key];
            const tone = a.tone === "alert" ? "text-alert" : a.tone === "flare" ? "text-flare" : "text-mint";
            return (
              <button
                key={a.key}
                onClick={() => update({ [a.key]: !on } as Partial<Prefs>)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  on ? "border-border bg-secondary/30" : "border-border bg-secondary/10 opacity-60 hover:opacity-100",
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", on ? tone : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium">{a.label}</p>
                  <p className="text-[10.5px] leading-snug text-muted-foreground">{a.desc}</p>
                </div>
                <span className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                  on ? "bg-mint" : "bg-secondary border border-border",
                )}>
                  <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform", on ? "translate-x-5" : "translate-x-1")} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* forecast threshold + cadence */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">Forecast alert threshold (₹/day)</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="1000"
              value={prefs.forecastThreshold}
              onChange={(e) => setLocal({ ...prefs, forecastThreshold: Number(e.target.value) })}
              onBlur={(e) => update({ forecastThreshold: Number(e.target.value) || 0 })}
              className="h-9 w-full rounded-lg border border-border bg-card px-3 text-[13px] tabular-nums outline-none focus:border-mint/40"
            />
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">/day</span>
          </div>
          <p className="mt-1 text-[10.5px] text-muted-foreground">Alert when daily §16 bleed exceeds this.</p>
        </div>
        <div>
          <p className="mb-2 font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">Cadence</p>
          <div className="grid grid-cols-3 gap-1.5">
            {CADENCES.map((c) => (
              <button
                key={c.key}
                onClick={() => update({ cadence: c.key as Prefs["cadence"] })}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-center transition-colors",
                  prefs.cadence === c.key ? "border-mint/50 bg-mint/[0.08] text-mint" : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground",
                )}
              >
                <p className="text-[11.5px] font-medium">{c.label}</p>
                <p className="text-[9px] text-muted-foreground">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        {save.isPending ? (
          <p className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.12em] uppercase text-mint">
            <Loader2 className="h-3 w-3 animate-spin" /> saving…
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">Changes save automatically.</p>
        )}
        <button
          onClick={() => testSend.mutate()}
          disabled={testSend.isPending || (!prefs.emailEnabled && !prefs.whatsappEnabled && !prefs.smsEnabled)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-mint/30 bg-mint/[0.06] px-3 h-9 text-[11.5px] font-medium text-mint transition-colors hover:bg-mint/[0.12] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testSend.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {testSend.isPending ? "Sending…" : "Send test alert"}
        </button>
      </div>
    </section>
  );
}
