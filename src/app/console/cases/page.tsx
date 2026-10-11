"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Scale, Gavel, Landmark, FileCheck2, ArrowRight } from "lucide-react";
import { PageHead, EmptyState, Chip, fmtDate, inrCompact } from "@/components/console/kit";
import { inr } from "@/lib/format";
import { DeadlineBadge } from "@/components/console/event-row";
import { CASE_STAGES, CASE_STAGE_META } from "@/lib/domain";
import { cn } from "@/lib/utils";

type CaseRow = {
  id: string;
  caseNumber: string;
  stage: string;
  filedOn: string;
  hearingOn: string | null;
  awardAmount: number | null;
  decisionBy: string;
  daysLeft: number;
  claim: number;
  docsCount: number;
  invoice: {
    id: string;
    number: string;
    amount: number;
    status: string;
    daysOverdue: number;
    buyer: { name: string; gstin: string | null };
  };
};

const STAGE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  filed: FileCheck2,
  admitted: Scale,
  hearing: Gavel,
  award: Landmark,
};

export default function CasesPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ cases: CaseRow[] }>({
    queryKey: ["cases"],
    queryFn: async () => (await fetch("/api/cases")).json(),
  });

  const advance = useMutation({
    mutationFn: async (invoiceId: string) =>
      (
        await fetch(`/api/invoices/${invoiceId}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "advance" }),
        })
      ).json(),
    onSuccess: (res: { message?: string; error?: string }) => {
      if (res.error) toast.error(res.error);
      else toast.success(res.message ?? "Case advanced");
      qc.invalidateQueries({ queryKey: ["cases"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
        <div className="h-64 animate-pulse rounded-xl bg-secondary/50" />
      </div>
    );
  }

  const live = data.cases.filter((c) => c.stage !== "award");
  const closed = data.cases.filter((c) => c.stage === "award");

  return (
    <>
      <PageHead
        kicker="MSEFC references · §18"
        title="ODR cases"
        desc="Every reference filed on the government ODR portal, with its statutory 90-day decision clock. The council must rule within the window; buyer appeals require a 75% deposit under §19."
      />

      {data.cases.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No references filed yet"
          body="Run an invoice through the pipeline — once its evidence pack is sealed you can file it on MSME Samadhaan in one click."
        >
          <Link href="/console/invoices" className="inline-flex items-center gap-2 rounded-lg bg-mint px-4 h-10 text-[13px] font-semibold text-[#04140b]">
            Go to invoices <ArrowRight className="h-4 w-4" />
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {live.map((c) => {
            const idx = CASE_STAGE_META[c.stage]?.idx ?? 0;
            const Icon = STAGE_ICON[c.stage] ?? Scale;
            return (
              <article key={c.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="font-mono text-[12px] tracking-[0.06em] text-mint">{c.caseNumber}</p>
                      <Chip tone="mint">
                        <Icon className="h-3 w-3" /> {CASE_STAGE_META[c.stage]?.label}
                      </Chip>
                    </div>
                    <p className="mt-1.5 font-display text-[16px] font-semibold">{c.invoice.buyer.name}</p>
                    <p className="mt-0.5 font-mono text-[10.5px] tracking-[0.08em] text-muted-foreground">
                      {c.invoice.number} · filed {fmtDate(c.filedOn)} · {c.docsCount} documents on record
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <DeadlineBadge daysLeft={c.daysLeft} />
                    <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">
                      decide by {fmtDate(c.decisionBy)}
                    </p>
                  </div>
                </div>

                {/* stage progress */}
                <ol className="mt-5 flex items-start">
                  {CASE_STAGES.map((s, i) => {
                    const done = i < idx;
                    const active = i === idx;
                    return (
                      <li key={s} className="relative flex-1">
                        {i > 0 ? <span className={cn("absolute right-1/2 top-[11px] -left-2 h-[2px]", done || active ? "bg-mint/60" : "bg-border")} aria-hidden /> : null}
                        <div className="relative flex flex-col items-center gap-1.5 px-1">
                          <span className={cn("h-[22px] w-[22px] rounded-full border", done ? "border-mint bg-mint" : active ? "border-mint shadow-[0_0_0_4px_rgba(45,240,156,0.12)]" : "border-border")}>
                            {done ? <span className="m-[5px] block h-[7px] w-[7px] rounded-full bg-[#04140b]" /> : null}
                          </span>
                          <span className={cn("font-mono text-[9px] tracking-[0.12em] uppercase", done || active ? "text-foreground" : "text-muted-foreground/60")}>
                            {CASE_STAGE_META[s].label}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] tracking-[0.06em] text-muted-foreground">
                    <span>principal {inrCompact(c.invoice.amount)}</span>
                    <span className="text-mint">claim {inr(Math.round(c.claim))}</span>
                    {c.hearingOn ? <span className="text-flare">hearing {fmtDate(c.hearingOn)}</span> : null}
                  </div>
                  {c.stage !== "award" ? (
                    <button
                      onClick={() => advance.mutate(c.invoice.id)}
                      disabled={advance.isPending}
                      className="inline-flex items-center gap-2 rounded-lg border border-mint/40 bg-mint/[0.07] px-4 h-9 text-[12.5px] font-semibold text-mint transition-colors hover:bg-mint/[0.14] disabled:opacity-50"
                    >
                      {c.stage === "filed" ? "Mark admitted" : c.stage === "admitted" ? "Record hearing" : "Record award"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}

          {closed.length > 0 ? (
            <section className="rounded-xl border border-mint/25 bg-mint/[0.04] p-5">
              <h2 className="font-display text-[15px] font-semibold text-mint">Decreed — awaiting / completed recovery</h2>
              <ul className="mt-3 space-y-2">
                {closed.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3">
                    <div>
                      <p className="font-mono text-[11.5px] text-mint">{c.caseNumber}</p>
                      <p className="mt-0.5 text-[12.5px]">{c.invoice.buyer.name} · {c.invoice.number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[14px] font-semibold tabular-nums text-mint">{inr(Math.round(c.claim))}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">decreed</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-muted-foreground">Record the payment from the invoice drawer once the buyer remits — Recovery OS then settles supplier and fee.</p>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
