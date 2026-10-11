"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// dynamically import Cloudee with ssr:false (the avatar runtime uses
// URL.createObjectURL which is browser-only)
const Cloudee = dynamic(
  () => import("@/components/cloudee/cloudee.index").then((m) => m.default),
  { ssr: false, loading: () => <div className="h-[88px] w-[88px]" /> },
);

type AnimationName = string;

type TourStep = {
  id: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  animation: AnimationName;
};

const TOUR: TourStep[] = [
  {
    id: "welcome",
    title: "Hi, I'm Cloudee 👋",
    body: "I'm your Recovery OS guide. I'll walk you through how this engine recovers the money buyers owe you under the MSMED Act. This takes about 30 seconds — ready?",
    cta: { label: "Start the tour", href: "#next" },
    animation: "happy",
  },
  {
    id: "overview",
    title: "Your recovery dashboard",
    body: "This is the Overview. It shows your outstanding principal, the §16 interest compounding live, and the cost-of-inaction forecast — what you lose every day you wait.",
    cta: { label: "See the invoices", href: "/console/invoices" },
    animation: "excited",
  },
  {
    id: "invoices",
    title: "The pipeline",
    body: "Every invoice runs through 5 stages: Monitor → Notice → Evidence → Filed → Recovery. Click any invoice to serve a §16 demand, seal evidence, file on ODR, and recover — one click per stage.",
    cta: { label: "Meet the AI strategist", href: "/console/insights" },
    animation: "thinking",
  },
  {
    id: "insights",
    title: "AI recovery strategist",
    body: "Recovery OS reads your portfolio and writes a prioritised action plan — which invoices to chase first, concentration risks, and how much you'll recover. Powered by grounded LLM analysis.",
    cta: { label: "Check the analytics", href: "/console/analytics" },
    animation: "curious",
  },
  {
    id: "analytics",
    title: "See where your money is stuck",
    body: "Aging buckets, recovery velocity, buyer concentration — every chart driven by the same §16 compound-interest engine. Toggle the theme with the sun/moon button up top.",
    cta: { label: "View your profile", href: "/console/profile" },
    animation: "proud",
  },
  {
    id: "profile",
    title: "That's your profile",
    body: "Everything Recovery OS knows about your workspace — your org, your account, engine status, KPIs, and alert preferences — all in one place. You're all set! Press ⌘K anytime to search, or ? for shortcuts.",
    cta: { label: "Done — take me to the dashboard", href: "/console" },
    animation: "celebrate",
  },
];

const STORAGE_KEY = "ros-tour-completed";

export function GuideAvatar() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [minimized, setMinimized] = useState(false);

  // show the guide for first-time visitors (who haven't completed the tour)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const t = setTimeout(() => setActive(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    setActive(false);
    setMinimized(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  // close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && active) dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const next = () => {
    if (step >= TOUR.length - 1) {
      dismiss();
    } else {
      setStep(step + 1);
    }
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const current = TOUR[step];
  const isLast = step === TOUR.length - 1;

  // don't render until activated
  if (!active && !minimized) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-[95] flex items-end gap-3">
      {/* avatar + speech bubble */}
      <div className="pointer-events-auto relative flex items-end gap-3">
        {/* Cloudee avatar */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative shrink-0"
        >
          <Cloudee animation={current?.animation ?? "idle"} playing size={88} className="drop-shadow-[0_8px_24px_rgba(45,240,156,0.18)]" />
          {/* mint glow ring */}
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-mint/10 blur-xl" />
        </motion.div>

        {/* speech bubble */}
        <AnimatePresence mode="wait">
          {!minimized && current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: -12, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.2, 1, 0.3, 1] }}
              className="relative w-72 rounded-2xl border border-border bg-[#0b0e0c] p-4 shadow-2xl"
            >
              {/* pointer tail */}
              <div className="absolute bottom-6 left-[-7px] h-3 w-3 rotate-45 border-b border-l border-border bg-[#0b0e0c]" />

              {/* close + step counter */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] uppercase text-mint">
                  <Sparkles className="h-3 w-3" /> Cloudee · guide
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{step + 1}/{TOUR.length}</span>
                  <button onClick={dismiss} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Dismiss guide">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* content */}
              <h3 className="mt-2.5 font-display text-[15px] font-semibold tracking-tight">{current.title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{current.body}</p>

              {/* nav */}
              <div className="mt-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {step > 0 && (
                    <button onClick={prev} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground" aria-label="Previous step">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* progress dots */}
                  <div className="flex items-center gap-1 px-1">
                    {TOUR.map((s, i) => (
                      <span key={s.id} className={cn("h-1 rounded-full transition-all", i === step ? "w-4 bg-mint" : "w-1 bg-muted-foreground/30")} />
                    ))}
                  </div>
                </div>

                {current.cta && (
                  <Link
                    href={current.cta.href === "#next" ? "#" : current.cta.href}
                    onClick={(e) => {
                      if (current.cta?.href === "#next") {
                        e.preventDefault();
                        next();
                      } else {
                        next();
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-mint px-3 h-8 text-[11.5px] font-semibold text-[#04140b] transition-colors hover:bg-[#4df7ae]"
                  >
                    {isLast ? "Finish" : current.cta.label}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* minimized pill */}
        {minimized && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={() => setMinimized(false)}
            className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/[0.08] px-3 h-9 text-[11.5px] font-medium text-mint transition-colors hover:bg-mint/[0.14]"
          >
            <Sparkles className="h-3.5 w-3.5" /> Resume tour
          </motion.button>
        )}
      </div>
    </div>
  );
}
