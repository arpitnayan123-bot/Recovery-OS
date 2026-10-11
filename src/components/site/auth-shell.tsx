"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck, AlertTriangle, Lock, Mail, User, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/site/logo";
import { Providers } from "@/components/console/providers";
import { cn } from "@/lib/utils";

type Mode = "signup" | "login";

const COPY: Record<Mode, {
  kicker: string;
  title: string;
  sub: string;
  cta: string;
  loading: string;
  switchText: string;
  switchHref: string;
  switchLabel: string;
}> = {
  signup: {
    kicker: "Create account",
    title: "Switch on the recovery engine.",
    sub: "Create your Recovery OS account. Email + password, hashed with bcrypt. Your workspace is yours — demo orgs are isolated, real orgs are yours to keep.",
    cta: "Create account",
    loading: "Creating account…",
    switchText: "Already have an account?",
    switchHref: "/login",
    switchLabel: "Sign in",
  },
  login: {
    kicker: "Welcome back",
    title: "Sign in to Recovery OS.",
    sub: "Pick up where your pipeline left off. Every invoice, case and recovered rupee is right where you left it.",
    cta: "Sign in",
    loading: "Signing in…",
    switchText: "New to Recovery OS?",
    switchHref: "/signup",
    switchLabel: "Create an account",
  },
};

export function AuthPage({ mode }: { mode: Mode }) {
  return (
    <Providers>
      <AuthForm mode={mode} />
    </Providers>
  );
}

function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/console";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const copy = COPY[mode];

  const submit = useMutation({
    mutationFn: async () => {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload: Record<string, string> = { email, password };
      if (mode === "signup" && name) payload.name = name;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong");
      return data;
    },
    onSuccess: (data) => {
      toast.success(mode === "signup" ? "Account created — welcome to Recovery OS." : `Welcome back${data?.user?.name ? ", " + data.user.name : ""}.`);
      setError(null);
      // give the toast a beat, then route
      setTimeout(() => router.push(next), 280);
    },
    onError: (e: Error) => {
      setError(e.message);
      toast.error(e.message);
    },
  });

  // demo sign-in: spin up a seeded demo org + session, then go to the profile
  const demoSignIn = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "demo" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.org?.id) throw new Error(data?.error ?? "Demo sign-in failed");
      return data;
    },
    onSuccess: () => {
      toast.success("Demo workspace ready — welcome to Recovery OS.");
      setError(null);
      setTimeout(() => router.push("/console/profile"), 300);
    },
    onError: (e: Error) => {
      setError(e.message);
      toast.error(e.message);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    submit.mutate();
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#070908] text-foreground">
      {/* atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_15%_0%,rgba(45,240,156,0.10),transparent_60%),radial-gradient(50%_40%_at_100%_100%,rgba(0,161,219,0.08),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" />

        <header className="relative z-10 flex h-16 items-center px-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-mono text-[11px] tracking-[0.16em] uppercase">Back to site</span>
          </Link>
          <div className="ml-auto">
            <Logo />
          </div>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[440px]"
          >
            {/* glass card */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.025] p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-8">
              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-mint/[0.12] to-transparent" style={{ maskImage: "linear-gradient(black, transparent 70%)", WebkitMaskImage: "linear-gradient(black, transparent 70%)" }} />
              <div className="relative">
                <p className="font-mono text-[11px] tracking-[0.24em] uppercase text-mint">{copy.kicker}</p>
                <h1 className="mt-3 font-display text-[1.7rem] font-semibold leading-[1.1] tracking-[-0.02em]">{copy.title}</h1>
                <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{copy.sub}</p>

                <form onSubmit={onSubmit} className="mt-7 space-y-4">
                  {mode === "signup" && (
                    <Field
                      icon={<User className="h-4 w-4" />}
                      label="Full name"
                      type="text"
                      value={name}
                      onChange={setName}
                      placeholder="Rajesh Patel"
                      autoComplete="name"
                      optional
                    />
                  )}
                  <Field
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@company.in"
                    autoComplete="email"
                    required
                  />
                  <Field
                    icon={<Lock className="h-4 w-4" />}
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                  />

                  {error ? (
                    <div role="alert" className="flex items-start gap-2 rounded-lg border border-alert/40 bg-alert/[0.08] px-3 py-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-alert" />
                      <p className="text-[12.5px] leading-snug text-alert">{error}</p>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submit.isPending}
                    className="group relative inline-flex w-full items-center justify-center gap-2 rounded-lg bg-mint px-4 h-11 text-[13.5px] font-semibold text-[#04140b] transition-all hover:bg-[#4df7ae] disabled:opacity-60"
                  >
                    {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {submit.isPending ? copy.loading : copy.cta}
                    {!submit.isPending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                  </button>
                </form>

                {/* demo sign-in — only on the login page */}
                {mode === "login" && (
                  <div className="mt-5">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/8" />
                      <span className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground">or</span>
                      <div className="h-px flex-1 bg-white/8" />
                    </div>
                    <button
                      type="button"
                      onClick={() => demoSignIn.mutate()}
                      disabled={demoSignIn.isPending}
                      className="group relative mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-mint/30 bg-mint/[0.06] px-4 h-11 text-[13.5px] font-medium text-mint transition-all hover:border-mint/50 hover:bg-mint/[0.1] disabled:opacity-60"
                    >
                      {demoSignIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {demoSignIn.isPending ? "Spinning up demo…" : "Use demo sign in"}
                      {!demoSignIn.isPending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                    </button>
                    <p className="mt-2.5 text-center text-[11px] leading-relaxed text-muted-foreground/70">
                      No password needed — explore the full Recovery OS console with a seeded demo workspace.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-5 text-[12.5px]">
                  <span className="text-muted-foreground">{copy.switchText}</span>
                  <Link href={copy.switchHref} className="font-medium text-mint transition-colors hover:text-[#4df7ae]">
                    {copy.switchLabel} →
                  </Link>
                </div>
              </div>
            </div>

            {/* trust strip */}
            <div className="mt-5 flex items-center justify-center gap-2 text-center">
              <ShieldCheck className="h-3.5 w-3.5 text-mint" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-foreground">
                bcrypt-hashed · db-backed · revocable · no card required
              </span>
            </div>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground/70">
              By continuing you agree to use Recovery OS for lawful recovery of receivables under the MSMED Act, 2006. Filings are prepared for your review — nothing here is legal advice.
            </p>
          </motion.div>
        </main>
      </div>
  );
}

function Field({
  icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  optional,
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-foreground">
        {label}
        {optional ? <span className="text-muted-foreground/60">(optional)</span> : <span className="text-mint">*</span>}
      </span>
      <div className="group relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-mint">
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="h-11 w-full rounded-lg border border-white/10 bg-black/30 pl-10 pr-3.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-mint/50 focus:bg-black/40"
        />
      </div>
    </label>
  );
}
