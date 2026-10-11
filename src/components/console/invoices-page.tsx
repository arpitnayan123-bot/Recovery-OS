"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Plus, Search, Inbox, ChevronRight, FileText, Send, FolderCheck, Scale, Landmark as Award, Upload, Download, Send as SendBulk, X, CheckSquare, GitCompare } from "lucide-react";
import { PageHead, StatusChip, LiveInterest, EmptyState, fmtDate, inrCompact } from "./kit";
import { inr } from "@/lib/format";
import { InvoiceDrawer } from "./invoice-drawer";
import { ImportCsvDialog } from "./import-dialog";
import { InvoiceComparison } from "./invoice-comparison";
import type { InvoiceDTO } from "./types";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "recovery", label: "In recovery" },
  { key: "watch", label: "Within term" },
  { key: "recovered", label: "Recovered" },
] as const;

const STAGE_ICON = [Inbox, Send, FolderCheck, Scale, Award];

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const selectedIds = useMemo(() => Array.from(selected).slice(0, 4), [selected]);

  const { data, isLoading } = useQuery<{ invoices: InvoiceDTO[] }>({
    queryKey: ["invoices"],
    queryFn: async () => (await fetch("/api/invoices")).json(),
  });

  const sync = useMutation({
    mutationFn: async () => (await fetch("/api/invoices/sync", { method: "POST" })).json(),
    onSuccess: (res: { synced: number; message?: string }) => {
      if (res.synced > 0) toast.success(`Ingested ${res.synced} invoice${res.synced > 1 ? "s" : ""}`);
      else toast(res.message ?? "Nothing new to ingest");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const rows = useMemo(() => {
    let list = data?.invoices ?? [];
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((r) => r.buyer.name.toLowerCase().includes(needle) || r.number.toLowerCase().includes(needle));
    }
    return list;
  }, [data, q]);

  // invoices eligible for bulk serve: watch status + overdue
  const bulkEligible = useMemo(() => rows.filter((r) => r.status === "watch" && r.daysOverdue > 0), [rows]);
  const selectedEligible = useMemo(() => bulkEligible.filter((r) => selected.has(r.id)), [bulkEligible, selected]);
  const allEligibleSelected = bulkEligible.length > 0 && bulkEligible.every((r) => selected.has(r.id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllEligible = () => {
    if (allEligibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of bulkEligible) next.delete(r.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of bulkEligible) next.add(r.id);
        return next;
      });
    }
  };
  const clearSelection = () => setSelected(new Set());

  return (
    <>
      <PageHead
        kicker="Ledger · §15 monitored"
        title="Invoices"
        desc="Every invoice Recovery OS ingests is watched against the 45-day statutory term. Click any row to run the recovery pipeline — notice, evidence, ODR filing, award, money."
      >
        <button
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 h-10 text-[13px] font-medium transition-colors hover:border-mint/40 hover:text-mint disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", sync.isPending && "animate-spin")} />
          {sync.isPending ? "Syncing…" : "Sync source"}
        </button>
        <button
          onClick={() => setImportOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 h-10 text-[13px] font-medium transition-colors hover:border-mint/40 hover:text-mint"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </button>
        <a
          href={`/api/invoices/export?filter=${filter}`}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 h-10 text-[13px] font-medium transition-colors hover:border-mint/40 hover:text-mint"
        >
          <Download className="h-4 w-4" />
          Export
        </a>
        {bulkEligible.length > 0 && (
          <button
            onClick={() => { if (selectedEligible.length === 0) toggleAllEligible(); setBulkOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg border border-flare/40 bg-flare/[0.08] px-4 h-10 text-[13px] font-medium text-flare transition-colors hover:bg-flare/[0.14]"
          >
            <SendBulk className="h-4 w-4" />
            Bulk action
            <span className="rounded border border-flare/30 bg-flare/10 px-1.5 py-0.5 font-mono text-[9px] tabular-nums">{bulkEligible.length}</span>
          </button>
        )}
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-mint px-4 h-10 text-[13px] font-semibold text-[#04140b] transition-colors hover:bg-[#4df7ae]"
        >
          <Plus className="h-4 w-4" />
          Add invoice
        </button>
      </PageHead>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-lg border px-3.5 h-9 font-mono text-[11px] tracking-[0.1em] uppercase transition-colors",
              filter === f.key
                ? "border-mint/50 bg-mint/[0.09] text-mint"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search buyer or invoice #"
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground/60 focus:border-mint/40"
          />
        </div>
      </div>

      {/* selection bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-mint/30 bg-mint/[0.06] px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-mint" />
          <span className="text-[12.5px] font-medium">
            {selected.size} selected
            {selectedEligible.length !== selected.size && (
              <span className="ml-1.5 font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">
                · {selectedEligible.length} eligible to serve
              </span>
            )}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggleAllEligible} className="rounded-lg border border-border px-3 h-8 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground">
              {allEligibleSelected ? "Clear eligible" : `Select all eligible (${bulkEligible.length})`}
            </button>
            <button onClick={clearSelection} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 h-8 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-3 w-3" /> Clear
            </button>
            {selectedIds.length >= 2 && (
              <button
                onClick={() => setCompareOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-mint/30 bg-mint/[0.06] px-3 h-8 text-[11.5px] font-medium text-mint transition-colors hover:bg-mint/[0.12]"
              >
                <GitCompare className="h-3.5 w-3.5" /> Compare {selectedIds.length}
              </button>
            )}
            {selectedEligible.length > 0 && (
              <button
                onClick={() => setBulkOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-flare px-3 h-8 text-[11.5px] font-semibold text-[#1a1305] transition-colors hover:bg-[#ffc555]"
              >
                <SendBulk className="h-3.5 w-3.5" /> Bulk action · {selectedEligible.length}
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary/50" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter === "all" ? "No invoices yet" : "Nothing in this bucket"}
          body={
            filter === "all"
              ? "Connect your source and sync, or add an invoice manually. Recovery OS starts watching it the moment it lands."
              : "No invoices currently match this stage. Try another filter or run a sync."
          }
        >
          <button onClick={() => sync.mutate()} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 h-10 text-[13px] hover:border-mint/40 hover:text-mint">
            <RefreshCw className="h-3.5 w-3.5" /> Sync source
          </button>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[920px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
                <th className="w-10 px-3 py-3.5">
                  {bulkEligible.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allEligibleSelected}
                      onChange={toggleAllEligible}
                      aria-label="Select all eligible invoices"
                      className="h-4 w-4 cursor-pointer accent-[#2df09c]"
                    />
                  )}
                </th>
                <th className="px-5 py-3.5 font-medium">Stage</th>
                <th className="px-4 py-3.5 font-medium">Buyer / invoice</th>
                <th className="px-4 py-3.5 font-medium text-right">Principal</th>
                <th className="px-4 py-3.5 font-medium text-right">§16 accruing</th>
                <th className="px-4 py-3.5 font-medium text-right">Claimable</th>
                <th className="px-4 py-3.5 font-medium">Statutory clock</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((r) => {
                const Icon = STAGE_ICON[Math.min(4, r.stageIndex)];
                const done = r.status === "recovered";
                const isEligible = r.status === "watch" && r.daysOverdue > 0;
                const isChecked = selected.has(r.id);
                return (
                  <tr
                    key={r.id}
                    onClick={() => setOpenId(r.id)}
                    className={cn(
                      "group cursor-pointer transition-colors hover:bg-secondary/50",
                      isChecked && "bg-mint/[0.04]",
                    )}
                  >
                    <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                      {!done && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(r.id)}
                          aria-label={`Select ${r.number}`}
                          className="h-4 w-4 cursor-pointer accent-[#2df09c]"
                        />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-mint">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{r.buyer.name}</p>
                      <p className="mt-0.5 font-mono text-[10.5px] tracking-[0.08em] text-muted-foreground">{r.number}</p>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">{inr(r.amount)}</td>
                    <td className="px-4 py-4 text-right tabular-nums">
                      {done ? (
                        <span className="text-muted-foreground">—</span>
                      ) : r.daysOverdue > 0 ? (
                        <span className="text-flare">
                          <LiveInterest baseInterest={r.interest} perSecond={r.interestPerSecond} compact />
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">not yet</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right font-medium tabular-nums text-mint">{inrCompact(r.claimable)}</td>
                    <td className="px-4 py-4">
                      <StatusChip status={r.status} />
                      <p className={cn("mt-1 font-mono text-[10px] tracking-[0.08em] uppercase", r.daysOverdue > 0 && !done ? "text-alert" : "text-muted-foreground")}>
                        {done
                          ? `closed ${r.recoveredAt ? fmtDate(r.recoveredAt) : ""}`
                          : r.daysOverdue > 0
                            ? `day ${45 + r.daysOverdue} · ${r.daysOverdue}d overdue`
                            : `day ${Math.max(1, Math.ceil((Date.now() - new Date(r.issuedOn).getTime()) / 86_400_000))} of 45`}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 font-mono text-[10.5px] tracking-[0.12em] uppercase text-muted-foreground transition-colors group-hover:text-mint">
                        open <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {openId ? <InvoiceDrawer invoiceId={openId} onClose={() => setOpenId(null)} /> : null}
      {addOpen ? <AddInvoiceDialog onClose={() => setAddOpen(false)} onAdded={(id) => setOpenId(id)} /> : null}
      {importOpen ? <ImportCsvDialog onClose={() => setImportOpen(false)} /> : null}
      {bulkOpen ? (
        <BulkServeDialog
          invoices={selectedEligible}
          onClose={() => setBulkOpen(false)}
          onDone={() => { clearSelection(); setBulkOpen(false); }}
        />
      ) : null}
      {compareOpen && selectedIds.length >= 2 ? (
        <InvoiceComparison ids={selectedIds} onClose={() => setCompareOpen(false)} />
      ) : null}
    </>
  );
}

function AddInvoiceDialog({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ buyer: "", number: "", amount: "", issuedOn: new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10) });

  const create = useMutation({
    mutationFn: async () =>
      (
        await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, amount: Number(form.amount) }),
        })
      ).json(),
    onSuccess: (res: { invoice?: InvoiceDTO; error?: string }) => {
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Invoice ${res.invoice?.number} ingested — now under statutory watch`);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      onClose();
      if (res.invoice) onAdded(res.invoice.id);
    },
  });

  const input =
    "h-10 w-full rounded-lg border border-border bg-card px-3 text-[13px] outline-none placeholder:text-muted-foreground/60 focus:border-mint/40";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-[#0b0e0c] p-6">
        <h3 className="font-display text-lg font-semibold tracking-tight">Add invoice</h3>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Manual entry. Due date is set automatically at day 45 under §15 of the MSMED Act.
        </p>
        <div className="mt-5 space-y-3.5">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Buyer name</span>
            <input className={input} value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} placeholder="Meru Auto Components Pvt Ltd" />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Invoice number</span>
            <input className={input} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="SPC/2026/0601" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Amount (₹)</span>
              <input className={input} type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="1850000" />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">Invoice date</span>
              <input className={input} type="date" value={form.issuedOn} onChange={(e) => setForm({ ...form, issuedOn: e.target.value })} />
            </label>
          </div>
        </div>
        <div className="mt-6 flex gap-2.5">
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-mint h-10 text-[13px] font-semibold text-[#04140b] disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            {create.isPending ? "Ingesting…" : "Ingest & watch"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-border px-4 h-10 text-[13px] text-muted-foreground">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- bulk serve dialog ----------------------------- */

type BulkAction = "remind" | "evidence" | "file";

const ACTION_META: Record<BulkAction, { label: string; verb: string; desc: string; color: string; icon: any }> = {
  remind: { label: "Serve demand", verb: "served", desc: "§15/§16 statutory notice on every overdue watch invoice", color: "flare", icon: SendBulk },
  evidence: { label: "Seal evidence", verb: "sealed", desc: "5-document evidence pack on every notice-served invoice", color: "mint", icon: FolderCheck },
  file: { label: "File on ODR", verb: "filed", desc: "MSEFC reference on every evidence-ready invoice (90-day clock)", color: "mint", icon: Scale },
};

function BulkServeDialog({
  invoices,
  onClose,
  onDone,
}: {
  invoices: InvoiceDTO[];
  onClose: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [action, setAction] = useState<BulkAction>("remind");
  const [results, setResults] = useState<null | { id: string; number: string; buyer: string; status: "done" | "skipped" | "not_ready"; reason?: string }[]>(null);
  const [summary, setSummary] = useState<{ total: number; done: number; skipped: number; notReady: number } | null>(null);

  const run = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/invoices/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: invoices.map((i) => i.id), action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Bulk action failed");
      return data;
    },
    onSuccess: (data) => {
      setResults(data.results);
      setSummary(data.summary);
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["forecast"] });
      qc.invalidateQueries({ queryKey: ["cases"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalClaim = invoices.reduce((s, i) => s + i.claimable, 0);
  const meta = ACTION_META[action];
  const Icon = meta.icon;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-[#0b0e0c] p-6">
        <div className="flex items-center gap-2.5">
          <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg border", meta.color === "flare" ? "border-flare/30 bg-flare/[0.08] text-flare" : "border-mint/30 bg-mint/[0.08] text-mint")}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">Bulk pipeline action</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Run one recovery stage across {invoices.length} invoice{invoices.length === 1 ? "" : "s"} at once.</p>
          </div>
        </div>

        {results ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-mint/30 bg-mint/[0.06] p-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-mint" />
                <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-mint">Bulk action complete</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded border border-mint/30 bg-mint/[0.06] py-2">
                  <p className="font-display text-xl font-semibold text-mint tabular-nums">{summary?.done ?? 0}</p>
                  <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">{meta.verb}</p>
                </div>
                <div className="rounded border border-flare/30 bg-flare/[0.06] py-2">
                  <p className="font-display text-xl font-semibold text-flare tabular-nums">{summary?.skipped ?? 0}</p>
                  <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">skipped</p>
                </div>
                <div className="rounded border border-border bg-secondary/40 py-2">
                  <p className="font-display text-xl font-semibold tabular-nums text-muted-foreground">{summary?.notReady ?? 0}</p>
                  <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">not ready</p>
                </div>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
              <ul className="divide-y divide-border/50">
                {results.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-[12px]">
                    <span className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      r.status === "done" ? "bg-mint" : r.status === "skipped" ? "bg-flare" : "bg-muted-foreground",
                    )} />
                    <span className="font-mono text-[10.5px] text-muted-foreground">{r.number}</span>
                    <span className="truncate">{r.buyer}</span>
                    <span className={cn(
                      "ml-auto font-mono text-[9px] tracking-[0.1em] uppercase",
                      r.status === "done" ? "text-mint" : "text-muted-foreground",
                    )}>
                      {r.status === "done" ? meta.verb : r.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={onDone} className="w-full rounded-lg bg-mint h-10 text-[13px] font-semibold text-[#04140b]">
              Done
            </button>
          </div>
        ) : (
          <>
            {/* action selector */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {(Object.keys(ACTION_META) as BulkAction[]).map((a) => {
                const m = ACTION_META[a];
                const MIcon = m.icon;
                return (
                  <button
                    key={a}
                    onClick={() => setAction(a)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors",
                      action === a
                        ? m.color === "flare" ? "border-flare/50 bg-flare/[0.08] text-flare" : "border-mint/50 bg-mint/[0.08] text-mint"
                        : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <MIcon className="h-4 w-4" />
                    <span className="text-[11px] font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-border bg-secondary/20 p-4">
              <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground">{meta.desc}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="font-display text-2xl font-semibold tabular-nums">{invoices.length}</p>
                <p className="text-[12.5px] text-muted-foreground">invoice{invoices.length === 1 ? "" : "s"} selected</p>
              </div>
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                Total claimable: <span className="font-semibold text-mint">{inrCompact(totalClaim)}</span>
                {action === "file" && " · each gets an ODR case number + 90-day §18 clock"}
              </p>
            </div>

            <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-border">
              <ul className="divide-y divide-border/50">
                {invoices.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-3 py-2 text-[12px]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-flare" />
                    <span className="font-mono text-[10.5px] text-muted-foreground">{i.number}</span>
                    <span className="truncate">{i.buyer.name}</span>
                    <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">{inrCompact(i.claimable)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button onClick={onClose} className="rounded-lg border border-border px-4 h-10 text-[13px] text-muted-foreground">
                Cancel
              </button>
              <button
                onClick={() => run.mutate()}
                disabled={run.isPending || invoices.length === 0}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-lg h-10 text-[13px] font-semibold disabled:opacity-50",
                  meta.color === "flare" ? "bg-flare text-[#1a1305]" : "bg-mint text-[#04140b]",
                )}
              >
                <Icon className="h-4 w-4" />
                {run.isPending ? `${meta.verb.charAt(0).toUpperCase() + meta.verb.slice(1)}…` : `${meta.label} · ${invoices.length}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
