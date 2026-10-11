"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, Download, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ImportResult = {
  batch: { id: string; filename: string; total: number; created: number; skipped: number; errors: { row: number; message: string }[] };
  message: string;
};

const SAMPLE = `buyer,number,amount,issuedOn,gstin,city
Meru Auto Components Pvt Ltd,SPC/2026/0601,1850000,2026-01-15,27AABCM1234K1ZV,Pune
Northstar Retail India Ltd,NSR/2026/1200,4200000,2026-02-03,07AABCN5678L1ZQ,New Delhi
Apex Electricals & Fittings,APEX/1212,675500,2026-02-20,29AACCA9012M1Z8,Mumbai`;

export function ImportCsvDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  const run = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Pick a CSV file first");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("source", "csv");
      const res = await fetch("/api/imports", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Import failed");
      return data as ImportResult;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadSample = () => {
    const blob = new Blob([SAMPLE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recovery-os-invoices-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-[#0b0e0c] p-6">
        <button onClick={onClose} className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-mint/30 bg-mint/[0.08] text-mint">
            <FileSpreadsheet className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">Import invoices (CSV)</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Bulk-ingest your receivables export. Deduped by invoice number.</p>
          </div>
        </div>

        {result ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-mint/30 bg-mint/[0.06] p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-mint" />
                <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-mint">Import complete</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Created" value={result.batch.created} tone="mint" />
                <Stat label="Skipped" value={result.batch.skipped} tone="flare" />
                <Stat label="Errors" value={result.batch.errors.length} tone={result.batch.errors.length ? "alert" : "muted"} />
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">{result.message}</p>
            </div>
            {result.batch.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-alert/30 bg-alert/[0.04] p-3">
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase text-alert">
                  <AlertTriangle className="h-3 w-3" /> Row errors
                </p>
                <ul className="space-y-1 text-[12px] text-muted-foreground">
                  {result.batch.errors.slice(0, 20).map((e, i) => (
                    <li key={i} className="font-mono">
                      <span className="text-alert">row {e.row}</span> · {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                }}
                className="flex-1 rounded-lg border border-border h-10 text-[13px] hover:border-mint/40 hover:text-mint"
              >
                Import another
              </button>
              <button onClick={onClose} className="flex-1 rounded-lg bg-mint h-10 text-[13px] font-semibold text-[#04140b]">
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) setFile(f);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-10 text-center transition-colors",
                dragging ? "border-mint/60 bg-mint/[0.06]" : "border-border hover:border-mint/40 hover:bg-secondary/40",
              )}
            >
              <Upload className={cn("h-6 w-6", dragging ? "text-mint" : "text-muted-foreground")} />
              <p className="mt-3 text-[13px] font-medium">{file ? file.name : "Drop your CSV here, or click to browse"}</p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground">
                {file ? `${(file.size / 1024).toFixed(1)} KB · ready to import` : "max 2MB · columns: buyer, number, amount, issuedOn, gstin"}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button onClick={downloadSample} className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] uppercase text-muted-foreground transition-colors hover:text-mint">
                <Download className="h-3.5 w-3.5" /> Download template
              </button>
              <div className="flex gap-2.5">
                <button onClick={onClose} className="rounded-lg border border-border px-4 h-10 text-[13px] text-muted-foreground">
                  Cancel
                </button>
                <button
                  onClick={() => run.mutate()}
                  disabled={!file || run.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-mint px-5 h-10 text-[13px] font-semibold text-[#04140b] disabled:opacity-50"
                >
                  {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {run.isPending ? "Importing…" : "Import & watch"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "mint" | "flare" | "alert" | "muted" }) {
  const color =
    tone === "mint" ? "text-mint" : tone === "flare" ? "text-flare" : tone === "alert" ? "text-alert" : "text-muted-foreground";
  return (
    <div className="rounded-md border border-border bg-secondary/40 py-2">
      <p className={cn("font-display text-xl font-semibold tabular-nums", color)}>{value}</p>
      <p className="mt-0.5 font-mono text-[9px] tracking-[0.14em] uppercase text-muted-foreground">{label}</p>
    </div>
  );
}
