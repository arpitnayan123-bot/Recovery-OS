"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Lock,
  Check,
  Send,
  Eye,
  FolderSearch,
  Scale,
  Gavel,
  Landmark,
  IndianRupee,
  FileText,
  FolderCheck,
  ChevronDown,
  ScanLine,
  FileDown,
} from "lucide-react";
import { StatusChip, Stamp, LiveInterest, fmtDate, fmtDateTime, inrCompact, KeyVal, Bar, RenderBoundary } from "./kit";
import { inr } from "@/lib/format";
import { EventRow } from "./event-row";
import { STAGES, stageIndexOf, CASE_STAGES, CASE_STAGE_META, buildStatutoryNotice } from "@/lib/domain";
import { SUCCESS_FEE } from "@/lib/domain";
import type { InvoiceDTO } from "./types";
import { cn } from "@/lib/utils";

type SessionOrg = { name: string };

export function InvoiceDrawer({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery<{ invoice: InvoiceDTO }>({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => (await fetch(`/api/invoices/${invoiceId}`)).json(),
    enabled: Boolean(invoiceId),
  });
  const { data: session } = useQuery<{ org: SessionOrg | null }>({
    queryKey: ["session"],
    queryFn: async () => (await fetch("/api/session")).json(),
  });

  const inv = data?.invoice;

  const action = useMutation({
    mutationFn: async (type: string) =>
      (await fetch(`/api/invoices/${invoiceId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })).json(),
    onSuccess: (res: { invoice?: InvoiceDTO; message?: string; error?: string }) => {
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.message) toast.success(res.message);
      qc.setQueryData(["invoice", invoiceId], { invoice: res.invoice });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["cases"] });
      qc.invalidateQueries({ queryKey: ["buyers"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });

  // client-side evidence "scan" theatre
  const [scanStage, setScanStage] = useState(-1); // -1 idle, 0..4 revealing
  const scanning = scanStage >= 0 && scanStage < 5;
  const runScan = () => {
    setScanStage(0);
    let i = 0;
    const tick = () => {
      i += 1;
      if (i < 5) {
        setScanStage(i);
        setTimeout(tick, 340);
      } else {
        setTimeout(() => {
          setScanStage(-1);
          action.mutate("evidence");
        }, 420);
      }
    };
    setTimeout(tick, 340);
  };

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Invoice recovery flow">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <RenderBoundary label="invoice-drawer">
      <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-border bg-[#0a0c0b] shadow-2xl">
        {!inv ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-mint border-t-transparent" />
          </div>
        ) : (
          <>
            {/* header */}
            <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="min-w-0">
                <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-mint">{inv.number}</p>
                <h2 className="mt-1 truncate font-display text-xl font-semibold tracking-tight">{inv.buyer.name}</h2>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{inv.buyer.gstin ?? "GSTIN —"}</p>
              </div>
              <div className="flex items-center gap-3">
                {inv.status === "recovered" ? <Stamp label="recovered" /> : null}
                {inv.status === "award" ? <Stamp label="award won" /> : null}
                <StatusChip status={inv.status} />
                <button
                  onClick={onClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* money strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-card p-3.5">
                  <p className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">Principal</p>
                  <p className="mt-1.5 font-display text-[15px] font-semibold tabular-nums">{inrCompact(inv.amount)}</p>
                </div>
                <div className="rounded-lg border border-flare/25 bg-flare/[0.05] p-3.5">
                  <p className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-flare">§16 interest</p>
                  <p className="mt-1.5 font-display text-[15px] font-semibold tabular-nums text-flare">
                    {inv.status === "recovered" ? inrCompact(0) : <LiveInterest baseInterest={inv.interest} perSecond={inv.interestPerSecond} compact />}
                  </p>
                </div>
                <div className="rounded-lg border border-mint/25 bg-mint/[0.05] p-3.5">
                  <p className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-mint">Claimable</p>
                  <p className="mt-1.5 font-display text-[15px] font-semibold tabular-nums text-mint">{inrCompact(inv.claimable)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-[10.5px] tracking-[0.06em] text-muted-foreground">
                <span>issued {fmtDate(inv.issuedOn)}</span>
                <span>due {fmtDate(inv.dueOn)} (§15: day 45)</span>
                <span className={inv.daysOverdue > 0 ? "text-alert" : "text-mint"}>
                  {inv.daysOverdue > 0 ? `overdue ${inv.daysOverdue} days` : inv.status === "recovered" ? "closed" : "within term"}
                </span>
              </div>

              {/* stage track */}
              <div className="mt-7">
                <StageTrack status={inv.status} inGrace={inv.inGrace} />
              </div>

              {/* action panel */}
              <div className="mt-6">
                <ActionPanel
                  inv={inv}
                  orgName={session?.org?.name ?? "the supplier"}
                  pending={action.isPending || scanning}
                  scanStage={scanStage}
                  onRemind={() => action.mutate("remind")}
                  onEvidence={runScan}
                  onFile={() => action.mutate("file")}
                  onAdvance={() => action.mutate("advance")}
                  onRecover={() => action.mutate("recover")}
                />
              </div>

              {/* statutory documents — downloadable PDFs */}
              <DocumentsPanel inv={inv} />

              {/* case panel */}
              {inv.case ? <CasePanel inv={inv} /> : null}

              {/* evidence docs */}
              {inv.docs.length > 0 ? (
                <section className="mt-7">
                  <h3 className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] uppercase text-muted-foreground">
                    <FolderCheck className="h-3.5 w-3.5 text-mint" /> Evidence pack · {inv.docs.length} documents
                  </h3>
                  <ul className="mt-3 space-y-1.5">
                    {inv.docs.map((d, i) => (
                      <motion.li
                        key={d.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-mint" />
                        <span className="flex-1 truncate text-[12.5px]">{d.name}</span>
                        <span className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-mint">✓ verified</span>
                      </motion.li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {/* notices */}
              {inv.reminders.length > 0 ? <Notices reminders={inv.reminders} /> : null}

              {/* timeline */}
              <section className="mt-7">
                <h3 className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-muted-foreground">Timeline</h3>
                <div className="mt-2 divide-y divide-border/50">
                  {inv.events.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
      </RenderBoundary>
    </div>
  );
}

/* ------------------------------- stage track ------------------------------- */

function StageTrack({ status, inGrace }: { status: string; inGrace: boolean }) {
  const current = stageIndexOf(status);
  return (
    <ol className="flex items-start">
      {STAGES.map((s, i) => {
        const done = i < current || status === "recovered";
        const active = i === current && status !== "recovered";
        return (
          <li key={s.key} className="relative flex-1">
            {i > 0 ? (
              <span
                className={cn(
                  "absolute right-1/2 top-[13px] -left-2 h-[2px]",
                  done || active ? "bg-mint/60" : "bg-border"
                )}
                aria-hidden
              />
            ) : null}
            <div className="relative flex flex-col items-center gap-2 px-1">
              <span
                className={cn(
                  "flex h-[26px] w-[26px] items-center justify-center rounded-full border text-[10px] font-mono",
                  done
                    ? "border-mint bg-mint text-[#04140b]"
                    : active
                      ? "border-mint text-mint shadow-[0_0_0_4px_rgba(45,240,156,0.12)]"
                      : "border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : String(i + 1).padStart(2, "0")}
                {active ? <span className="absolute inset-0 rounded-full border border-mint/50 animate-pulse-dot" /> : null}
              </span>
              <span className={cn("text-center font-mono text-[8.5px] leading-tight tracking-[0.1em] uppercase", done || active ? "text-foreground" : "text-muted-foreground/60")}>
                {s.short}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------ action panel ------------------------------- */

const SCANNING_DOCS = ["tax_invoice", "po", "challan", "gst_filing", "ledger"];

function ActionPanel({
  inv,
  orgName,
  pending,
  scanStage,
  onRemind,
  onEvidence,
  onFile,
  onAdvance,
  onRecover,
}: {
  inv: InvoiceDTO;
  orgName: string;
  pending: boolean;
  scanStage: number;
  onRemind: () => void;
  onEvidence: () => void;
  onFile: () => void;
  onAdvance: () => void;
  onRecover: () => void;
}) {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [confirmRecover, setConfirmRecover] = useState(false);
  const scanning = scanStage >= 0 && scanStage < 5;

  const notice = useMemo(
    () =>
      buildStatutoryNotice({
        supplierName: orgName,
        buyerName: inv.buyer.name,
        invoiceNumber: inv.number,
        amount: inv.amount,
        issuedOn: new Date(inv.issuedOn),
        dueOn: new Date(inv.dueOn),
      }),
    [orgName, inv]
  );

  if (inv.status === "recovered") {
    const net = (inv.recoveredAmount ?? 0) * (1 - SUCCESS_FEE);
    const fee = inv.successFee ?? 0;
    return (
      <div className="rounded-xl border border-mint/30 bg-mint/[0.05] p-5">
        <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-mint">Case closed — money moved</p>
        <div className="mt-3">
          <KeyVal k="Recovered" v={inr(inv.recoveredAmount ?? 0)} />
          <KeyVal k="Supplier receives" v={inr(Math.round(net))} />
          <KeyVal k={`Success fee (${(SUCCESS_FEE * 100).toFixed(1)}%)`} v={inr(Math.round(fee))} />
          <KeyVal k="Settled on" v={inv.recoveredAt ? fmtDate(inv.recoveredAt) : "—"} />
        </div>
      </div>
    );
  }

  const btn =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl h-12 font-semibold text-[14px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  let body: React.ReactNode = null;

  if (inv.inGrace) {
    body = (
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <Lock className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-3 text-[13.5px] font-medium">Inside the 45-day statutory term</p>
        <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
          Recovery OS is watching this invoice. If the buyer does not pay by <span className="text-foreground">{fmtDate(inv.dueOn)}</span>, §16
          interest switches on automatically and the statutory demand becomes servable.
        </p>
      </div>
    );
  } else if (inv.status === "watch") {
    body = (
      <>
        <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-flare">Step 1 · statutory demand</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          The buyer is {inv.daysOverdue} days past the §15 term. Recovery OS has drafted a demand notice claiming
          principal + §16 compound interest (3× bank rate, monthly rests).
        </p>
        <button onClick={() => setNoticeOpen(true)} className={cn(btn, "mt-4 border border-flare/40 bg-flare/[0.08] text-flare hover:bg-flare/[0.14]")}>
          <Eye className="h-4 w-4" /> Preview the statutory notice
        </button>
        <button onClick={onRemind} disabled={pending} className={cn(btn, "mt-2.5 bg-mint text-[#04140b] hover:bg-[#4df7ae]")}>
          <Send className="h-4 w-4" /> Serve demand on {inv.buyer.name.split(" ")[0]}
        </button>
      </>
    );
  } else if (inv.status === "reminder_sent") {
    body = (
      <>
        <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-flare">Step 2 · evidence pack</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Notice served{inv.reminders[0] ? ` on ${fmtDate(inv.reminders[0].sentOn)}` : ""}. The council will want proof — Recovery OS extracts and
          verifies the five documents that make a §18 reference unanswerable.
        </p>
        {scanning ? (
          <div className="mt-4 rounded-xl border border-mint/25 bg-mint/[0.04] p-4">
            <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-mint">
              <ScanLine className="h-3.5 w-3.5 animate-pulse" /> extracting {SCANNING_DOCS[Math.max(0, scanStage)]?.replace(/_/g, " ")}
            </p>
            <Bar className="mt-3" pct={((scanStage + 1) / 5) * 100} />
          </div>
        ) : null}
        <button onClick={onEvidence} disabled={pending} className={cn(btn, "mt-4 bg-mint text-[#04140b] hover:bg-[#4df7ae]")}>
          <FolderSearch className="h-4 w-4" /> Assemble evidence pack
        </button>
      </>
    );
  } else if (inv.status === "evidence_ready") {
    body = (
      <>
        <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-mint">Step 3 · file on MSME Samadhaan</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Evidence sealed. Filing the reference on the government ODR portal starts the statutory clock — the council
          must decide within 90 days (§18(2)), and any buyer appeal requires a 75% deposit (§19).
        </p>
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <KeyVal k="Applicant" v={orgName} />
          <KeyVal k="Respondent" v={inv.buyer.name} />
          <KeyVal k="Claim (P + §16)" v={inr(Math.round(inv.totalDue))} />
          <KeyVal k="Evidence on record" v={`${inv.docs.length} documents`} />
        </div>
        <button onClick={onFile} disabled={pending} className={cn(btn, "mt-4 bg-mint text-[#04140b] hover:bg-[#4df7ae]")}>
          <Scale className="h-4 w-4" /> File reference on ODR portal
        </button>
      </>
    );
  } else if (inv.case) {
    const stage = inv.case.stage;
    const next =
      stage === "filed"
        ? { label: "Council admits the reference", desc: "Record admission — the buyer is summoned and the case moves to hearing.", icon: Scale, cta: "Mark admitted by council" }
        : stage === "admitted"
          ? { label: "Schedule hearing", desc: "Conciliation-cum-arbitration hearing — your evidence pack is already on record.", icon: Gavel, cta: "Record hearing" }
          : { label: "Council award", desc: "Award decrees principal + §16 interest. Appeal requires a 75% deposit under §19 — most buyers settle.", icon: Landmark, cta: "Record MSEFC award" };
    const NextIcon = next.icon;
    body = (
      <>
        <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-mint">Step 4 · before the council</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{next.desc}</p>
        <button onClick={onAdvance} disabled={pending} className={cn(btn, "mt-4 bg-mint text-[#04140b] hover:bg-[#4df7ae]")}>
          <NextIcon className="h-4 w-4" /> {next.cta}
        </button>
      </>
    );
  }

  const canRecover = !inv.inGrace && inv.status !== "recovered";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {body}
      {canRecover ? (
        <div className="mt-4 border-t border-border pt-4">
          {confirmRecover ? (
            <div className="rounded-lg border border-mint/25 bg-mint/[0.05] p-3.5">
              <p className="text-[12.5px] text-muted-foreground">
                Buyer paid? Record the receipt and close this file.
              </p>
              <div className="mt-2">
                <KeyVal k="Amount received" v={inr(Math.round(inv.totalDue))} />
                <KeyVal k="Supplier net" v={inr(Math.round(inv.totalDue * (1 - SUCCESS_FEE)))} />
                <KeyVal k={`Success fee`} v={inr(Math.round(inv.totalDue * SUCCESS_FEE))} />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    onRecover();
                    setConfirmRecover(false);
                  }}
                  disabled={pending}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-mint h-9 text-[12.5px] font-semibold text-[#04140b]"
                >
                  <IndianRupee className="h-3.5 w-3.5" /> Confirm receipt
                </button>
                <button onClick={() => setConfirmRecover(false)} className="rounded-lg border border-border px-3 h-9 text-[12.5px] text-muted-foreground">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRecover(true)}
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border h-10 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-mint/40 hover:text-mint disabled:opacity-50"
            >
              <Landmark className="h-3.5 w-3.5" /> Buyer paid out of band — record payment
            </button>
          )}
        </div>
      ) : null}

      {/* notice letter modal */}
      <AnimatePresence>
        {noticeOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8"
          >
            <div className="absolute inset-0 bg-black/80" onClick={() => setNoticeOpen(false)} />
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="relative flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-[#0b0e0c]"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-flare">draft · statutory demand</p>
                <button onClick={() => setNoticeOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close notice">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <pre className="flex-1 overflow-y-auto whitespace-pre-wrap px-6 py-5 font-mono text-[11.5px] leading-relaxed text-foreground/90">
                {notice.body}
              </pre>
              <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">
                  claim {inr(Math.round(notice.totalDue))} · {notice.daysOverdue}d overdue
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/documents/${inv.id}?kind=statutory_notice`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-9 text-[12.5px] font-medium transition-colors hover:border-mint/40 hover:text-mint"
                  >
                    <FileDown className="h-3.5 w-3.5" /> Download PDF
                  </a>
                  <button
                    onClick={() => {
                      setNoticeOpen(false);
                      onRemind();
                    }}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-mint px-4 h-9 text-[12.5px] font-semibold text-[#04140b]"
                  >
                    <Send className="h-3.5 w-3.5" /> Issue & serve
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------- case panel -------------------------------- */

function CasePanel({ inv }: { inv: InvoiceDTO }) {
  const kase = inv.case!;
  return (
    <section className="mt-7 rounded-xl border border-mint/20 bg-mint/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-mono text-[11px] tracking-[0.16em] uppercase text-mint">ODR reference · {kase.caseNumber}</h3>
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">
          filed {fmtDate(kase.filedOn)}
        </span>
      </div>
      <div className="mt-4">
        <StageTrack4 stage={kase.stage} />
      </div>
      <div className="mt-4">
        <KeyVal k="Decision deadline" v={fmtDate(new Date(new Date(kase.filedOn).getTime() + 90 * 86_400_000))} />
        {kase.hearingOn ? <KeyVal k="Hearing" v={fmtDateTime(kase.hearingOn)} /> : null}
        {kase.awardAmount ? <KeyVal k="Award decreed" v={inr(Math.round(kase.awardAmount))} /> : null}
      </div>
    </section>
  );
}

function StageTrack4({ stage }: { stage: string }) {
  const idx = CASE_STAGE_META[stage]?.idx ?? 0;
  return (
    <ol className="flex items-start">
      {CASE_STAGES.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s} className="relative flex-1">
            {i > 0 ? <span className={cn("absolute right-1/2 top-[11px] -left-2 h-[2px]", done || active ? "bg-mint/60" : "bg-border")} aria-hidden /> : null}
            <div className="relative flex flex-col items-center gap-1.5 px-1">
              <span className={cn("h-[22px] w-[22px] rounded-full border", done ? "border-mint bg-mint" : active ? "border-mint shadow-[0_0_0_4px_rgba(45,240,156,0.12)]" : "border-border")}>
                {done ? <Check className="m-[3px] h-3 w-3 text-[#04140b]" /> : null}
              </span>
              <span className={cn("font-mono text-[8.5px] tracking-[0.12em] uppercase", done || active ? "text-foreground" : "text-muted-foreground/60")}>
                {CASE_STAGE_META[s].label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* --------------------------------- notices --------------------------------- */

function Notices({ reminders }: { reminders: InvoiceDTO["reminders"] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (reminders.length === 0) return null;
  return (
    <section className="mt-7">
      <h3 className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] uppercase text-muted-foreground">
        <Send className="h-3.5 w-3.5 text-flare" /> Notices served · {reminders.length}
      </h3>
      <div className="mt-3 space-y-2">
        {reminders.map((r) => (
          <div key={r.id} className="overflow-hidden rounded-lg border border-border bg-card">
            <button
              onClick={() => setOpen(open === r.id ? null : r.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
              aria-expanded={open === r.id}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open === r.id && "rotate-180")} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px]">{r.subject}</span>
                <span className="mt-0.5 block font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
                  {r.channel} · served {fmtDate(r.sentOn)}
                </span>
              </span>
            </button>
            {open === r.id ? (
              <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap border-t border-border px-5 py-4 font-mono text-[11px] leading-relaxed text-foreground/85">
                {r.body}
              </pre>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- documents panel ----------------------------- */

/** Downloadable statutory PDFs — statutory notice (always), evidence pack
 *  (once sealed), ODR dossier (once filed). The API generates real PDFs. */
function DocumentsPanel({ inv }: { inv: InvoiceDTO }) {
  const hasEvidence = inv.stageIndex >= 2 || inv.docs.length > 0;
  const hasCase = !!inv.case;

  const docs = [
    {
      kind: "statutory_notice" as const,
      label: "Statutory demand notice",
      desc: "§15/§16 demand letter — principal + compound interest",
      available: inv.daysOverdue > 0 || inv.status !== "watch",
      tone: "flare" as const,
    },
    {
      kind: "evidence_pack" as const,
      label: "Evidence pack",
      desc: "5-document verified pack — PO, challans, GST filings",
      available: hasEvidence,
      tone: "mint" as const,
    },
    {
      kind: "odr_dossier" as const,
      label: "ODR filing dossier",
      desc: "Reference package for the MSEFC council (§18)",
      available: hasCase,
      tone: "mint" as const,
    },
  ];

  return (
    <section className="mt-7">
      <h3 className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] uppercase text-muted-foreground">
        <FileDown className="h-3.5 w-3.5 text-mint" /> Statutory documents · PDF
      </h3>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {docs.map((d) => {
          const tone = d.tone === "flare" ? "border-flare/30 bg-flare/[0.04]" : "border-mint/25 bg-mint/[0.03]";
          return (
            <a
              key={d.kind}
              href={d.available ? `/api/documents/${inv.id}?kind=${d.kind}` : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!d.available}
              className={cn(
                "group relative flex flex-col rounded-lg border p-3.5 transition-all",
                d.available
                  ? cn(tone, "hover:border-mint/40 hover:shadow-md cursor-pointer")
                  : "border-border bg-secondary/20 opacity-50 cursor-not-allowed",
              )}
              onClick={(e) => { if (!d.available) e.preventDefault(); }}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md border",
                  d.available
                    ? d.tone === "flare" ? "border-flare/30 bg-flare/10 text-flare" : "border-mint/30 bg-mint/10 text-mint"
                    : "border-border bg-secondary text-muted-foreground",
                )}>
                  <FileDown className="h-3.5 w-3.5" />
                </span>
                {d.available ? (
                  <span className="font-mono text-[8.5px] tracking-[0.14em] uppercase text-mint opacity-0 transition-opacity group-hover:opacity-100">
                    open ↗
                  </span>
                ) : (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <p className="mt-2.5 text-[12.5px] font-medium leading-snug">{d.label}</p>
              <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground">{d.desc}</p>
              {!d.available && (
                <p className="mt-1.5 font-mono text-[8.5px] tracking-[0.1em] uppercase text-muted-foreground/70">
                  {d.kind === "statutory_notice" ? "overdue to unlock" : d.kind === "evidence_pack" ? "seal evidence first" : "file on ODR first"}
                </p>
              )}
            </a>
          );
        })}
      </div>
    </section>
  );
}
