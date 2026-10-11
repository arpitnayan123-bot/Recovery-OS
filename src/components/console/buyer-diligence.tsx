"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Loader2, ExternalLink, ShieldCheck, AlertTriangle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type DiligenceReport = {
  summary: string;
  riskLevel: "low" | "moderate" | "elevated" | "high";
  riskScore: number;
  signals: { type: string; text: string; source?: string; tone: "alert" | "flare" | "mint" | "muted" }[];
  sources: { url: string; name: string; snippet: string; host_name: string; date: string }[];
  runAt: string;
};

const LEVEL_META: Record<DiligenceReport["riskLevel"], { label: string; tone: string }> = {
  low: { label: "Low risk", tone: "border-mint/40 bg-mint/[0.08] text-mint" },
  moderate: { label: "Moderate risk", tone: "border-mint/30 bg-mint/[0.05] text-mint" },
  elevated: { label: "Elevated risk", tone: "border-flare/40 bg-flare/[0.08] text-flare" },
  high: { label: "High risk", tone: "border-alert/40 bg-alert/[0.08] text-alert" },
};

const SIGNAL_TONE: Record<string, string> = {
  alert: "border-alert/30 bg-alert/[0.05] text-alert",
  flare: "border-flare/30 bg-flare/[0.05] text-flare",
  mint: "border-mint/30 bg-mint/[0.05] text-mint",
  muted: "border-border bg-secondary text-muted-foreground",
};

export function BuyerDiligence({ buyerId, buyerName }: { buyerId: string; buyerName: string }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const { data } = useQuery<{ report: DiligenceReport | null }>({
    queryKey: ["diligence", buyerId],
    queryFn: async () => (await fetch(`/api/buyers/${buyerId}/diligence`)).json(),
    enabled: expanded,
  });

  const run = useMutation({
    mutationFn: async () => (await fetch(`/api/buyers/${buyerId}/diligence`, { method: "POST" })).json(),
    onSuccess: () => {
      toast.success(`Due diligence run on ${buyerName} — web signals & risk report ready.`);
      qc.invalidateQueries({ queryKey: ["diligence", buyerId] });
      setExpanded(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const report = data?.report;

  return (
    <div className="mt-4 rounded-lg border border-border/70 bg-panel/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-mint" />
          <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground">Buyer due diligence</p>
          {report && (
            <span className={cn("rounded-md border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.12em] uppercase", LEVEL_META[report.riskLevel].tone)}>
              {LEVEL_META[report.riskLevel].label} · {report.riskScore}/100
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!report && !run.isPending && (
            <button
              onClick={() => run.mutate()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-mint/30 bg-mint/[0.06] px-3 h-8 text-[11.5px] font-medium text-mint transition-colors hover:bg-mint/[0.12]"
            >
              <Search className="h-3 w-3" /> Run due diligence
            </button>
          )}
          {run.isPending && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-[11.5px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Scanning public records…
            </span>
          )}
          {report && !run.isPending && (
            <>
              <button
                onClick={() => run.mutate()}
                disabled={run.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-[11.5px] text-muted-foreground transition-colors hover:border-mint/30 hover:text-mint"
              >
                <Search className="h-3 w-3" /> Re-run
              </button>
              <button onClick={() => setExpanded((v) => !v)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 h-8 text-[11.5px] text-muted-foreground hover:text-foreground">
                {expanded ? "Hide" : "View report"}
              </button>
            </>
          )}
        </div>
      </div>

      {report && expanded && (
        <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
          <p className="text-[12.5px] leading-relaxed text-foreground/90">{report.summary}</p>

          {report.signals.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">
                <ShieldCheck className="h-3 w-3" /> Risk signals
              </p>
              <ul className="space-y-2">
                {report.signals.map((s, i) => (
                  <li key={i} className={cn("rounded-md border p-2.5", SIGNAL_TONE[s.tone] ?? SIGNAL_TONE.muted)}>
                    <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.12em] uppercase opacity-80">
                      {s.tone === "alert" ? <AlertTriangle className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                      {s.type.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-[12px] leading-snug">{s.text}</p>
                    {s.source && <p className="mt-1 font-mono text-[9.5px] tracking-[0.06em] opacity-60">source: {s.source}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.sources.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">
                <ExternalLink className="h-3 w-3" /> Public sources ({report.sources.length})
              </p>
              <ul className="space-y-1.5">
                {report.sources.slice(0, 6).map((s, i) => (
                  <li key={i} className="truncate text-[11.5px]">
                    <a href={s.url} target="_blank" rel="noreferrer" className="group inline-flex max-w-full items-center gap-1.5 text-mint/80 hover:text-mint">
                      <span className="truncate">{s.name || s.host_name}</span>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-50 group-hover:opacity-100" />
                    </a>
                    {s.snippet && <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">{s.snippet}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="font-mono text-[9.5px] tracking-[0.1em] uppercase text-muted-foreground">
            run {new Date(report.runAt).toLocaleString("en-IN")} · grounded in public web evidence + supplier ledger
          </p>
        </div>
      )}
    </div>
  );
}
