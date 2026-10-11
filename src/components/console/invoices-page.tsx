"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Plus, Search, Inbox, ChevronRight, FileText, Send, FolderCheck, Scale, Landmark as Award, Upload } from "lucide-react";
import { PageHead, StatusChip, LiveInterest, EmptyState, fmtDate, inrCompact } from "./kit";
import { inr } from "@/lib/format";
import { InvoiceDrawer } from "./invoice-drawer";
import { ImportCsvDialog } from "./import-dialog";
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
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
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
                return (
                  <tr
                    key={r.id}
                    onClick={() => setOpenId(r.id)}
                    className="group cursor-pointer transition-colors hover:bg-secondary/50"
                  >
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
