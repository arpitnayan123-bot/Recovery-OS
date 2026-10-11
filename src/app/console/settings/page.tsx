"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Landmark, Percent, Database } from "lucide-react";
import { PageHead, KeyVal, fmtDate } from "@/components/console/kit";

type SessionDTO = {
  org: {
    id: string;
    name: string;
    gstin: string | null;
    city: string | null;
    contact: string | null;
    source: string;
    isDemo: boolean;
    createdAt: string;
  } | null;
};

const SOURCE_LABEL: Record<string, string> = {
  tally: "Tally Prime",
  zoho: "Zoho Books",
  csv: "CSV / Excel ingest",
  manual: "Manual entry",
};

export default function SettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<SessionDTO>({
    queryKey: ["session"],
    queryFn: async () => (await fetch("/api/session")).json(),
  });

  const reset = useMutation({
    mutationFn: async () =>
      (await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset" }) })).json(),
    onSuccess: () => {
      qc.clear();
      toast.success("Workspace wiped — session ended");
      router.replace("/onboarding");
    },
  });

  const signOut = useMutation({
    mutationFn: async () => fetch("/api/session", { method: "DELETE" }),
    onSuccess: () => {
      qc.clear();
      router.replace("/");
    },
  });

  if (isLoading || !data?.org) {
    return <div className="h-64 animate-pulse rounded-xl bg-secondary/50" />;
  }

  const org = data.org;

  return (
    <>
      <PageHead kicker="Workspace" title="Settings" desc="Your organisation, the commercial terms, and the data Recovery OS operates on." />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-[15px] font-semibold">Organisation</h2>
          <div className="mt-3">
            <KeyVal k="Supplier" v={org.name} mono={false} />
            <KeyVal k="GSTIN" v={org.gstin ?? "—"} />
            <KeyVal k="City" v={org.city ?? "—"} mono={false} />
            <KeyVal k="Contact" v={org.contact ?? "—"} mono={false} />
            <KeyVal k="Live since" v={fmtDate(org.createdAt)} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
            <Percent className="h-4 w-4 text-mint" /> Commercial terms
          </h2>
          <div className="mt-3">
            <KeyVal k="Upfront cost" v="₹0 — nothing to subscribe" mono={false} />
            <KeyVal k="Success fee" v="12.5% of money actually recovered" mono={false} />
            <KeyVal k="Statutory interest" v="3× RBI bank rate, compounded monthly (§16)" mono={false} />
            <KeyVal k="Who we bill" v="The recovered amount, before it reaches you" mono={false} />
          </div>
          <p className="mt-3 border-t border-border pt-3 text-[12px] leading-relaxed text-muted-foreground">
            Recovery OS is paid only from results: if a claim fails or a buyer never pays, you owe nothing. The fee is
            deducted from each receipt at the moment it lands.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
            <Database className="h-4 w-4 text-mint" /> Data source
          </h2>
          <div className="mt-3">
            <KeyVal k="Connected" v={SOURCE_LABEL[org.source] ?? org.source} mono={false} />
            <KeyVal k="Mode" v={org.isDemo ? "Demo workspace (sample data)" : "Production workspace"} mono={false} />
          </div>
          <p className="mt-3 border-t border-border pt-3 text-[12px] leading-relaxed text-muted-foreground">
            In production, Recovery OS reads invoices and receipts read-only from your accounting system — Tally, Zoho
            Books or a CSV drop. Nothing in your books is ever modified.
          </p>
        </section>

        <section className="rounded-xl border border-alert/25 bg-alert/[0.03] p-5">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-alert">
            <AlertTriangle className="h-4 w-4" /> Danger zone
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            Wiping deletes this workspace, every invoice, notice, evidence pack and ODR case in it, and ends your
            session. You will return to onboarding.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={() => reset.mutate()}
              disabled={reset.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-alert/40 bg-alert/[0.07] px-4 h-10 text-[13px] font-semibold text-alert transition-colors hover:bg-alert/[0.14] disabled:opacity-50"
            >
              {reset.isPending ? "Wiping…" : "Wipe workspace & restart"}
            </button>
            <button
              onClick={() => signOut.mutate()}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 h-10 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Landmark className="h-3.5 w-3.5" /> End session only
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
