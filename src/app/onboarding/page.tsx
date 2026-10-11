"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HardDrive,
  FileSpreadsheet,
  BookOpen,
  PenLine,
  Loader2,
  ShieldCheck,
  Sparkles,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { LogoMark, Logo } from "@/components/site/logo";
import { Providers } from "@/components/console/providers";
import { cn } from "@/lib/utils";

const SOURCES = [
  { key: "tally", label: "Tally Prime", desc: "Read-only sync of sales ledger", icon: HardDrive },
  { key: "zoho", label: "Zoho Books", desc: "OAuth — invoices & receipts", icon: BookOpen },
  { key: "csv", label: "CSV / Excel", desc: "Drop your receivables export", icon: FileSpreadsheet },
  { key: "manual", label: "Manual", desc: "Enter invoices by hand", icon: PenLine },
] as const;

const HANDSHAKE = [
  "Establishing encrypted tunnel…",
  "Reading sales ledger (read-only)…",
  "Matching buyers to GST registry…",
  "Flagging §15 payment terms…",
];

const STEP_LABELS = ["Company details", "Connect invoice source", "Review & launch"];

/* zero-typing demo persona — mirrors the placeholders already on the form */
const DEMO_PERSONA = {
  company: "Shreeji Precision Components",
  contact: "Rajesh Patel",
  city: "Rajkot",
  gstin: "24ABJCS4821H1ZR",
};

export default function OnboardingPage() {
  return (
    <Providers>
      <OnboardingWizard />
    </Providers>
  );
}

function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [gstin, setGstin] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [handshake, setHandshake] = useState(-1);
  const [seed, setSeed] = useState(true);
  const [done, setDone] = useState(false);
  const [demoNavigating, setDemoNavigating] = useState(false);
  const [demoFailed, setDemoFailed] = useState(false);
  const demoGuard = useRef(false);

  /* surfaced when the server-side demo route had to bounce (?demo=failed) */
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("demo=failed")) {
      // async so state updates don't cascade synchronously within the effect,
      // and so the toast fires after the Toaster's own mount subscription
      const t1 = setTimeout(() => setDemoFailed(true), 0);
      const t2 = setTimeout(() => toast.error("The demo engine hit a snag. Press Instant demo once more."), 60);
      window.history.replaceState(null, "", "/onboarding");
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, []);

  const { data: session } = useQuery<{ org: { id: string; name: string } | null }>({
    queryKey: ["session"],
    queryFn: async () => (await fetch("/api/session")).json(),
  });

  const launch = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, contact, gstin, city, source, seed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.org?.id) {
        throw new Error(data?.error ?? `Workspace could not be created (${res.status})`);
      }
      return data as { org: { id: string } };
    },
    onSuccess: () => {
      setDone(true);
      setTimeout(() => router.replace("/console"), 900);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Launch failed — please try again.");
    },
  });

  // handshake theatre for source connect
  useEffect(() => {
    if (handshake < 0 || handshake >= HANDSHAKE.length) return;
    const t = setTimeout(() => setHandshake((h) => h + 1), 620);
    return () => clearTimeout(t);
  }, [handshake]);

  const connected = handshake >= HANDSHAKE.length;

  const canNext = useMemo(() => {
    if (step === 0) return company.trim().length >= 2;
    if (step === 1) return Boolean(source);
    return true;
  }, [step, company, source]);

  /* "Use demo details" — explore the whole flow without typing anything.
     Step 1: loads the demo persona and opens the next section.
     Step 2: links the demo source and opens Review & launch. */
  const useDemoDetails = () => {
    if (step === 0) {
      setCompany(DEMO_PERSONA.company);
      setContact(DEMO_PERSONA.contact);
      setCity(DEMO_PERSONA.city);
      setGstin(DEMO_PERSONA.gstin);
      setStep(1);
    } else if (step === 1) {
      setSource("tally");
      setHandshake(0);
      setStep(2);
    }
  };

  const input =
    "h-11 w-full rounded-lg border border-white/[0.09] bg-[#0a0d0b] px-3.5 text-[14px] text-foreground outline-none placeholder:text-white/25 transition-all hover:border-white/[0.16] focus:border-mint/50 focus:ring-4 focus:ring-mint/[0.07]";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070a08]">
      {/* ---------- ambient backdrop (echoes the hero) ---------- */}
      <div className="pointer-events-none absolute inset-0 bg-grid mask-radial-fade opacity-[0.35]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_42%_at_50%_-8%,rgba(45,240,156,0.11),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_42%_38%_at_88%_104%,rgba(0,161,219,0.07),transparent_70%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-7 sm:px-8 sm:py-9">
        {/* ---------- top bar ---------- */}
        <header className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Back to site" className="shrink-0">
            <Logo />
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-white/35 md:block">
              MSMED Act, 2006
            </span>
            {/* instant demo — plain navigation, works before hydration */}
            <a
              href="/onboarding/demo"
              onClick={() => {
                if (demoGuard.current) return;
                demoGuard.current = true;
                setDemoNavigating(true);
              }}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border border-mint/35 bg-mint/[0.08] px-4 text-[12.5px] font-semibold text-mint transition-all duration-200 hover:border-mint/60 hover:bg-mint/[0.15] hover:shadow-[0_6px_24px_-8px_rgba(45,240,156,0.35)] active:scale-[0.98]",
                demoNavigating && "pointer-events-none opacity-80"
              )}
            >
              {demoNavigating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {demoNavigating ? "Spinning up…" : "Instant demo — skip setup"}
            </a>
          </div>
        </header>

        {done ? (
          /* ---------- success ---------- */
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
            >
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-mint/40 bg-mint/[0.08] shadow-[0_0_0_1px_rgba(45,240,156,0.15),0_18px_50px_-18px_rgba(45,240,156,0.35)]">
                <Check className="h-7 w-7 text-mint" />
                <span className="absolute inset-0 rounded-2xl border border-mint/25 motion-safe:animate-ping [animation-duration:1.8s]" />
              </span>
            </motion.div>
            <h1 className="mt-7 font-display text-3xl font-semibold tracking-tight">
              Recovery OS is on.
            </h1>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
              Invoices ingested, statutory clocks armed. Taking you to the console…
            </p>
            <div className="mt-6 flex items-center gap-1.5" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-mint/70 motion-safe:animate-pulse-dot"
                  style={{ animationDelay: `${i * 220}ms` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 1, 0.3, 1] }}
            className="mx-auto grid w-full flex-1 max-w-4xl items-center gap-10 py-8 lg:grid-cols-5 lg:py-10"
          >
            {/* ---------- left rail ---------- */}
            <aside className="lg:col-span-2">
              <p className="font-mono text-[11px] tracking-[0.28em] uppercase text-mint">
                Onboarding · Step {step + 1} of 3
              </p>
              {/* segmented progress */}
              <div className="mt-4 flex gap-1.5" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-[3px] flex-1 rounded-full transition-colors duration-500",
                      i < step ? "bg-mint" : i === step ? "bg-mint/45" : "bg-white/[0.08]"
                    )}
                  />
                ))}
              </div>

              <h1 className="mt-6 font-display text-[clamp(1.9rem,4.5vw,2.7rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
                {step === 0
                  ? "Who are we recovering for?"
                  : step === 1
                    ? "Where do your invoices live?"
                    : "Confirm & switch on."}
              </h1>
              <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                {step === 0
                  ? "Recovery OS works under the MSMED Act, 2006 — available to every registered micro, small or medium enterprise in India."
                  : step === 1
                    ? "Read-only. We watch due dates against the statutory 45-day term; nothing in your books is ever modified."
                    : "Zero upfront. A 12.5% fee applies only to money we actually recover — if a claim fails, you pay nothing."}
              </p>

              {/* step list with connector line */}
              <ol className="relative mt-8 space-y-3.5">
                <span
                  aria-hidden="true"
                  className="absolute bottom-3 left-[11px] top-3 w-px bg-white/[0.08]"
                />
                {STEP_LABELS.map((l, i) => (
                  <li key={l} className="relative flex items-center gap-3">
                    <span
                      className={cn(
                        "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px] transition-all duration-300",
                        i < step
                          ? "border-mint bg-mint text-[#04140b]"
                          : i === step
                            ? "border-mint/70 bg-[#0a0f0c] text-mint shadow-[0_0_0_4px_rgba(45,240,156,0.08)]"
                            : "border-white/[0.12] bg-[#0a0f0c] text-white/35"
                      )}
                    >
                      {i < step ? <Check className="h-3 w-3" /> : String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "text-[13px] transition-colors duration-300",
                        i === step ? "text-foreground" : i < step ? "text-foreground/70" : "text-muted-foreground/70"
                      )}
                    >
                      {l}
                    </span>
                  </li>
                ))}
              </ol>

              {/* trust strip */}
              <div className="mt-9 hidden gap-x-5 gap-y-2 border-t border-white/[0.07] pt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35 sm:flex sm:flex-wrap lg:mt-10">
                <span>₹0 upfront</span>
                <span className="text-mint/50">·</span>
                <span>paid only from recovery</span>
                <span className="text-mint/50">·</span>
                <span>no card required</span>
              </div>

              {session?.org ? (
                <Link
                  href="/console"
                  className="mt-6 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-mint hover:underline"
                >
                  ← return to {session.org.name}&apos;s console
                </Link>
              ) : null}
            </aside>

            {/* ---------- wizard card ---------- */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28, ease: [0.2, 1, 0.3, 1] }}
                  className="rounded-2xl border border-white/[0.08] bg-[#0c100d]/85 p-6 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:p-8"
                >
                  {demoFailed ? (
                    <div
                      role="alert"
                      className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#ff6b5e]/25 bg-[#ff6b5e]/[0.06] p-4 text-[12.5px] leading-relaxed text-[#ffb4ac]"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        The instant demo could not start. Press &ldquo;Instant demo — skip setup&rdquo;
                        again — it usually works on the second try.
                      </span>
                    </div>
                  ) : null}

                  {step === 0 ? (
                    /* -------- step 1: company -------- */
                    <div className="space-y-4">
                      <label className="block">
                        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          Registered company name *
                        </span>
                        <input
                          className={input}
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Shreeji Precision Components"
                          autoFocus
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-3.5">
                        <label className="block">
                          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            Your name
                          </span>
                          <input
                            className={input}
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            placeholder="Rajesh Patel"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            City
                          </span>
                          <input
                            className={input}
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Rajkot"
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          GSTIN
                        </span>
                        <input
                          className={cn(input, "font-mono uppercase tracking-[0.08em]")}
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value.toUpperCase().slice(0, 15))}
                          placeholder="24ABJCS4821H1ZR"
                        />
                      </label>
                      <p className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-[11.5px] leading-relaxed text-muted-foreground">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
                        Your GSTIN is how we verify MSEFC eligibility and pre-fill council filings.
                        Encrypted at rest.
                      </p>
                    </div>
                  ) : step === 1 ? (
                    /* -------- step 2: sources -------- */
                    <div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {SOURCES.map((s) => {
                          const Icon = s.icon;
                          const active = source === s.key;
                          return (
                            <button
                              key={s.key}
                              onClick={() => {
                                setSource(s.key);
                                setHandshake(0);
                              }}
                              className={cn(
                                "group relative rounded-xl border p-4 text-left transition-all duration-300",
                                active
                                  ? "border-mint/45 bg-mint/[0.05] shadow-[0_0_0_1px_rgba(45,240,156,0.14),0_18px_44px_-20px_rgba(45,240,156,0.18)]"
                                  : "border-white/[0.08] bg-[#0a0d0b] hover:-translate-y-0.5 hover:border-mint/25 hover:bg-[#0d120e]"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-300",
                                    active
                                      ? "border-mint/40 bg-mint/[0.08] text-mint"
                                      : "border-white/[0.08] bg-white/[0.03] text-muted-foreground group-hover:text-foreground"
                                  )}
                                >
                                  <Icon className="h-4.5 w-4.5" />
                                </span>
                                {active && connected ? (
                                  <span className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-mint">
                                    <Check className="h-3 w-3" /> linked
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-3.5 text-[13.5px] font-semibold">{s.label}</p>
                              <p className="mt-0.5 text-[11.5px] text-muted-foreground">{s.desc}</p>
                            </button>
                          );
                        })}
                      </div>

                      {source ? (
                        <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#0a0d0b] p-4 font-mono text-[11px] leading-relaxed">
                          <p className="mb-2.5 flex items-center gap-2 text-[9.5px] uppercase tracking-[0.2em] text-white/35">
                            <span className="h-1.5 w-1.5 rounded-full bg-mint/70" />
                            source handshake
                          </p>
                          {HANDSHAKE.slice(0, Math.min(handshake + 1, HANDSHAKE.length)).map((h, i) => {
                            const isLast = i === Math.min(handshake, HANDSHAKE.length - 1);
                            return (
                              <p key={h} className="flex items-center gap-2">
                                <span className="text-mint/50">&gt;</span>
                                {isLast && !connected ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-mint" />
                                ) : (
                                  <Check className="h-3 w-3 text-mint" />
                                )}
                                <span className={isLast && !connected ? "text-foreground" : "text-muted-foreground"}>
                                  {h}
                                </span>
                              </p>
                            );
                          })}
                          {connected ? (
                            <p className="mt-2.5 flex items-center gap-2 border-t border-white/[0.06] pt-2.5 text-mint">
                              <Check className="h-3 w-3" /> ledger reachable — recovery rules armed
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <label
                        className={cn(
                          "mt-5 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors duration-300",
                          seed ? "border-mint/30 bg-mint/[0.04]" : "border-white/[0.08] bg-[#0a0d0b] hover:border-white/[0.16]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={seed}
                          onChange={(e) => setSeed(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-[#2df09c]"
                        />
                        <span>
                          <span className="block text-[13px] font-medium">
                            Seed with a live-looking pipeline
                          </span>
                          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted-foreground">
                            Loads 8 sample invoices across every recovery stage so you can see the
                            machine working immediately. You can wipe it anytime from Settings.
                          </span>
                        </span>
                      </label>
                    </div>
                  ) : (
                    /* -------- step 3: confirm -------- */
                    <div>
                      <div className="rounded-xl border border-white/[0.08] bg-[#0a0d0b] p-5">
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-mint">
                          Workspace summary
                        </p>
                        <div className="mt-3 divide-y divide-white/[0.05]">
                          {[
                            ["Supplier", company || "—", false],
                            ["GSTIN", gstin || "—", true],
                            ["Source", SOURCES.find((s) => s.key === source)?.label ?? "—", false],
                            ["Sample pipeline", seed ? "Yes — 8 invoices" : "No — start empty", false],
                          ].map(([k, v, mono]) => (
                            <div key={k as string} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                              <span className="text-[12.5px] text-muted-foreground">{k}</span>
                              <span className={cn("text-right text-[13px] font-medium", mono && "font-mono text-[12px]")}>
                                {v}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 rounded-xl border border-mint/25 bg-mint/[0.04] p-5">
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-mint">
                          The deal
                        </p>
                        <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed">
                          <li className="flex gap-2.5">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" /> ₹0 upfront — no
                            subscription, no retainer
                          </li>
                          <li className="flex gap-2.5">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" /> 12.5% success
                            fee, charged only when money actually lands
                          </li>
                          <li className="flex gap-2.5">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" /> You approve
                            every step — nothing is filed without you
                          </li>
                        </ul>
                      </div>

                      {launch.isError ? (
                        <div
                          role="alert"
                          className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#ff6b5e]/25 bg-[#ff6b5e]/[0.06] p-4 text-[12.5px] leading-relaxed text-[#ffb4ac]"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            The workspace could not be created. Check your connection and press
                            &ldquo;Switch Recovery OS on&rdquo; again.
                          </span>
                        </div>
                      ) : null}

                      <button
                        onClick={() => launch.mutate()}
                        disabled={launch.isPending}
                        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-mint text-[14.5px] font-semibold text-[#04140b] shadow-[0_10px_36px_-12px_rgba(45,240,156,0.45)] transition-all hover:brightness-110 hover:shadow-[0_12px_40px_-10px_rgba(45,240,156,0.55)] active:scale-[0.99] disabled:opacity-60"
                      >
                        {launch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {launch.isPending ? "Arming statutory clocks…" : "Switch Recovery OS on"}
                        {!launch.isPending ? <ArrowRight className="h-4 w-4" /> : null}
                      </button>
                    </div>
                  )}

                  {/* -------- step controls -------- */}
                  {step < 2 ? (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 border-t border-white/[0.07] pt-5">
                      {step > 0 ? (
                        <button
                          onClick={() => setStep((s) => s - 1)}
                          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" /> Back
                        </button>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Lock className="h-3 w-3" /> no card required
                        </span>
                      )}
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={useDemoDetails}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.09] bg-transparent px-4 text-[12.5px] font-medium text-muted-foreground transition-all hover:border-mint/35 hover:bg-mint/[0.05] hover:text-mint active:scale-[0.98]"
                        >
                          <Sparkles className="h-3.5 w-3.5" /> Use demo details
                        </button>
                        <button
                          onClick={() => canNext && setStep((s) => s + 1)}
                          disabled={!canNext}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-mint px-5 text-[13px] font-semibold text-[#04140b] transition-all hover:brightness-110 hover:shadow-[0_8px_28px_-10px_rgba(45,240,156,0.5)] active:scale-[0.98] disabled:opacity-35"
                        >
                          Continue <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              {/* footer mono note under card */}
              <p className="mt-5 flex items-center justify-center gap-2 text-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/25">
                <LogoMark className="h-3 w-3 text-mint/40" />
                Recovery OS · automated under the MSMED Act, 2006
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
