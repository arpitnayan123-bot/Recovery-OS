"use client";

import { useQuery } from "@tanstack/react-query";
import { ScrollText, ShieldCheck, UploadCloud, KeyRound, FileSearch, Zap, Globe } from "lucide-react";
import { PageHead, fmtDateTime, inrCompact } from "@/components/console/kit";
import { cn } from "@/lib/utils";

type LogRow = {
  id: string;
  actor: string;
  action: string;
  meta: Record<string, unknown>;
  createdAt: string;
};
type ImportRow = {
  id: string;
  filename: string;
  source: string;
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
  createdAt: string;
};

const ACTION_META: Record<string, { icon: any; tone: string; label: string }> = {
  "auth.signup": { icon: KeyRound, tone: "text-mint", label: "Account created" },
  "auth.login": { icon: KeyRound, tone: "text-mint", label: "Signed in" },
  "auth.logout": { icon: KeyRound, tone: "text-muted-foreground", label: "Signed out" },
  "import.run": { icon: UploadCloud, tone: "text-mint", label: "CSV import" },
  "invoice.advance": { icon: Zap, tone: "text-flare", label: "Pipeline advanced" },
  "diligence.run": { icon: Globe, tone: "text-flare", label: "Buyer due diligence" },
  "insight.run": { icon: FileSearch, tone: "text-mint", label: "AI insight generated" },
  "document.notice_pdf": { icon: ScrollText, tone: "text-mint", label: "Statutory PDF generated" },
  "cron.tick": { icon: Zap, tone: "text-muted-foreground", label: "Reminder tick" },
  "session.end": { icon: KeyRound, tone: "text-muted-foreground", label: "Session ended" },
};

export default function SecurityPage() {
  const { data, isLoading } = useQuery<{ org: any; logs: LogRow[]; imports: ImportRow[] }>({
    queryKey: ["audit"],
    queryFn: async () => (await fetch("/api/audit")).json(),
  });

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-secondary/50" />;
  }

  const { org, logs, imports } = data;

  return (
    <>
      <PageHead
        kicker="Immutable accountability ledger"
        title="Audit log"
        desc="Every privileged action — sign-in, import, pipeline advance, due-diligence run, AI insight, PDF generation — is appended here forever. Built for the day a buyer or a council asks 'prove you did this'."
      />

      {/* org / account card */}
      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] uppercase text-mint">
              <ShieldCheck className="h-3.5 w-3.5" /> Workspace
            </p>
            <h2 className="mt-2 font-display text-lg font-semibold tracking-tight">{org.name}</h2>
            <p className="mt-1 font-mono text-[10.5px] tracking-[0.08em] text-muted-foreground">
              {org.gstin ?? "GSTIN —"} · {org.source} sync · {org.isDemo ? "demo data" : "live workspace"} · created {fmtDateTime(org.createdAt)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-right">
            <p className="font-display text-2xl font-semibold tabular-nums text-mint">{logs.length}</p>
            <p className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">events tracked (last 80)</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* audit log */}
        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <ScrollText className="h-4 w-4 text-mint" /> Event stream
          </h2>
          <div className="mt-4 max-h-[28rem] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
            <ol className="space-y-1">
              {logs.length === 0 ? (
                <li className="rounded-lg border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
                  No audit events yet. Actions you take across the console will appear here.
                </li>
              ) : (
                logs.map((l) => {
                  const meta = ACTION_META[l.action] ?? { icon: Zap, tone: "text-muted-foreground", label: l.action };
                  const Icon = meta.icon;
                  return (
                    <li key={l.id} className="flex items-start gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-secondary/40">
                      <span className={cn("mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-secondary", meta.tone)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <p className="text-[12.5px] font-medium">{meta.label}</p>
                          <p className="font-mono text-[9.5px] tracking-[0.1em] text-muted-foreground">{fmtDateTime(l.createdAt)}</p>
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
                          {l.action} · by {l.actor}
                        </p>
                        {Object.keys(l.meta).length > 0 && (
                          <p className="mt-0.5 truncate font-mono text-[9.5px] text-muted-foreground/70">
                            {Object.entries(l.meta).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join("  ·  ")}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ol>
          </div>
        </section>

        {/* import batches */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <UploadCloud className="h-4 w-4 text-flare" /> Import batches
          </h2>
          <div className="mt-4 max-h-[28rem] space-y-2.5 overflow-y-auto pr-1">
            {imports.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
                No imports yet. Use Import CSV on the invoices page.
              </p>
            ) : (
              imports.map((b) => (
                <div key={b.id} className="rounded-lg border border-border bg-secondary/20 p-3">
                  <p className="truncate text-[12.5px] font-medium" title={b.filename}>{b.filename}</p>
                  <p className="mt-0.5 font-mono text-[9.5px] tracking-[0.08em] text-muted-foreground">{fmtDateTime(b.createdAt)} · {b.source}</p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                    <div className="rounded border border-mint/30 bg-mint/[0.06] py-1">
                      <p className="font-display text-[13px] font-semibold text-mint">{b.created}</p>
                      <p className="font-mono text-[8px] tracking-[0.12em] uppercase text-muted-foreground">created</p>
                    </div>
                    <div className="rounded border border-flare/30 bg-flare/[0.06] py-1">
                      <p className="font-display text-[13px] font-semibold text-flare">{b.skipped}</p>
                      <p className="font-mono text-[8px] tracking-[0.12em] uppercase text-muted-foreground">skipped</p>
                    </div>
                    <div className="rounded border border-alert/30 bg-alert/[0.06] py-1">
                      <p className="font-display text-[13px] font-semibold text-alert">{b.errors.length}</p>
                      <p className="font-mono text-[8px] tracking-[0.12em] uppercase text-muted-foreground">errors</p>
                    </div>
                  </div>
                  <p className="mt-1.5 font-mono text-[9px] tracking-[0.1em] uppercase text-muted-foreground">{b.total} rows processed</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <p className="mt-6 flex items-center gap-2 border-t border-border pt-5 font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">
        <ShieldCheck className="h-3 w-3 text-mint" /> append-only · timestamped · admissible evidence of every action taken
      </p>
    </>
  );
}
