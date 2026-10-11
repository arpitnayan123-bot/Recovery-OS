"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Landmark, Percent, Database, KeyRound, User, ShieldCheck, Loader2, Lock } from "lucide-react";
import { PageHead, KeyVal, fmtDate } from "@/components/console/kit";
import { DigestPreferences } from "@/components/console/digest-preferences";
import { cn } from "@/lib/utils";

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

type AuthMe = {
  user: { id: string; email: string; name: string | null; phone: string | null; createdAt: string } | null;
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

  const { data: authData } = useQuery<AuthMe>({
    queryKey: ["auth-me"],
    queryFn: async () => (await fetch("/api/auth/me")).json(),
    staleTime: 60_000,
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
  const user = authData?.user;

  return (
    <>
      <PageHead kicker="Workspace" title="Settings" desc="Your organisation, your account, the commercial terms, and the data Recovery OS operates on." />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Organisation */}
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

        {/* Account — NEW */}
        <AccountSection user={user} />

        {/* Commercial terms */}
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

        {/* Data source */}
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

        {/* Digest preferences */}
        <div className="lg:col-span-2">
          <DigestPreferences />
        </div>

        {/* Danger zone */}
        <section className="rounded-xl border border-alert/25 bg-alert/[0.03] p-5 lg:col-span-2">
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

/* ------------------------------- account section ------------------------------- */

function AccountSection({ user }: { user: AuthMe["user"] }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const changePw = useMutation({
    mutationFn: async () => {
      if (next !== confirm) throw new Error("New password and confirmation do not match");
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Password change failed");
      return data;
    },
    onSuccess: () => {
      toast.success("Password updated — your account is secured with the new password.");
      setCurrent(""); setNext(""); setConfirm(""); setError(null);
    },
    onError: (e: Error) => { setError(e.message); toast.error(e.message); },
  });

  const input = "h-10 w-full rounded-lg border border-border bg-card px-3 text-[13px] outline-none placeholder:text-muted-foreground/60 focus:border-mint/40";

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
        <ShieldCheck className="h-4 w-4 text-mint" /> Account
      </h2>
      {user ? (
        <>
          <div className="mt-3">
            <KeyVal k="Signed in as" v={user.email} />
            {user.name ? <KeyVal k="Name" v={user.name} mono={false} /> : null}
            {user.phone ? <KeyVal k="Phone" v={user.phone} /> : null}
            <KeyVal k="Member since" v={fmtDate(user.createdAt)} />
            <KeyVal k="Session" v="bcrypt-hashed · db-backed · revocable" mono={false} />
          </div>

          {/* change password */}
          <div className="mt-5 border-t border-border pt-4">
            <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
              <KeyRound className="h-3 w-3" /> Change password
            </p>
            <form
              className="mt-3 space-y-2.5"
              onSubmit={(e) => { e.preventDefault(); setError(null); changePw.mutate(); }}
            >
              <input type="password" className={input} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" autoComplete="current-password" required />
              <input type="password" className={input} value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (min. 8 characters)" autoComplete="new-password" required />
              <input type="password" className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" required />
              {error ? <p className="text-[12px] text-alert">{error}</p> : null}
              <button
                type="submit"
                disabled={changePw.isPending || !current || !next}
                className="inline-flex items-center gap-2 rounded-lg bg-mint px-4 h-10 text-[13px] font-semibold text-[#04140b] transition-colors hover:bg-[#4df7ae] disabled:opacity-50"
              >
                {changePw.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {changePw.isPending ? "Updating…" : "Update password"}
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary/20 p-5 text-center">
          <User className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-[13px] text-muted-foreground">No account linked to this workspace.</p>
          <p className="mt-1 text-[12px] text-muted-foreground/70">Create an account to keep your recovery pipeline across sessions and devices.</p>
          <a href="/signup" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-mint px-4 h-10 text-[13px] font-semibold text-[#04140b] transition-colors hover:bg-[#4df7ae]">
            <UserPlus className="h-4 w-4" /> Create account
          </a>
        </div>
      )}
    </section>
  );
}

function UserPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}
