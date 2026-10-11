"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, LogIn, UserPlus, LogOut } from "lucide-react";
import Link from "next/link";
import { Logo, LogoMark } from "./logo";
import { cn } from "@/lib/utils";

type AuthUser = { id: string; email: string; name: string | null } | null;

const LINKS = [
  { href: "#problem", label: "The problem", note: "₹8 lakh crore, trapped" },
  { href: "#law", label: "The law", note: "MSMED Act, 2006" },
  { href: "#product", label: "The machine", note: "How recovery runs" },
  { href: "#calculator", label: "Calculator", note: "What you're owed" },
  { href: "#pricing", label: "Pricing", note: "Paid from recovery" },
  { href: "#faq", label: "FAQ", note: "Straight answers" },
];

declare global {
  interface Window {
    __lenis?: { stop: () => void; start: () => void } | undefined;
  }
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [user, setUser] = useState<AuthUser>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d?.user ?? null))
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  /* lock scroll while the menu is open (Lenis-aware) */
  useEffect(() => {
    if (open) {
      window.__lenis?.stop();
      document.documentElement.style.overflow = "hidden";
    } else {
      window.__lenis?.start();
      document.documentElement.style.overflow = "";
    }
    return () => {
      window.__lenis?.start();
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  /* esc closes */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -56, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.45, duration: 0.6, ease: [0.2, 1, 0.3, 1] }}
        className={cn(
          "fixed inset-x-0 top-0 z-[100] transition-[background-color,border-color,backdrop-filter] duration-300",
          open
            ? "bg-transparent"
            : pastHero
              ? "border-b border-ink/[0.08] bg-[#f7f6f1]/85 backdrop-blur-xl"
              : "border-b border-transparent bg-transparent"
        )}
      >
        <nav
          className="shell flex h-16 items-center justify-between"
          aria-label="Primary"
        >
          <Link href="/" aria-label="Recovery OS home" className="shrink-0">
            <span
              className={cn(
                "block transition-colors duration-300",
                open ? "text-[#f2f4ef]" : pastHero ? "text-ink" : "text-white"
              )}
            >
              <Logo tone={open || !pastHero ? "bright" : "auto"} />
            </span>
          </Link>

          {/* visible CTAs — Sign in + Start recovery, always on the bar */}
          <div className="flex items-center gap-2.5">
            {/* Sign in (hidden when menu open or when already signed in) */}
            {!open && !user && (
              <Link
                href="/login"
                className={cn(
                  "hidden items-center gap-1.5 rounded-full border px-4 h-9 text-[12px] font-medium transition-all duration-300 sm:inline-flex",
                  pastHero
                    ? "border-ink/15 bg-ink/[0.04] text-ink hover:border-ink/40 hover:bg-ink/[0.08]"
                    : "border-white/30 bg-white/[0.08] text-white backdrop-blur-md hover:bg-white/[0.16]",
                )}
              >
                <LogIn className="h-3.5 w-3.5" /> Sign in
              </Link>
            )}
            {/* signed-in badge + sign out */}
            {!open && user && (
              <div className="hidden items-center gap-2.5 sm:flex">
                <span className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.14em]",
                  pastHero ? "text-ink/55" : "text-white/55",
                )}>
                  {user.email}
                </span>
                <button
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    setUser(null);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 h-9 text-[12px] font-medium transition-all duration-300",
                    pastHero
                      ? "border-ink/15 bg-ink/[0.04] text-ink hover:border-ink/40 hover:bg-ink/[0.08]"
                      : "border-white/30 bg-white/[0.08] text-white backdrop-blur-md hover:bg-white/[0.16]",
                  )}
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            )}
            {/* Start recovery — primary CTA (hidden when menu open) */}
            {!open && (
              <Link
                href="/onboarding"
                className="btn-mint hidden h-9 items-center gap-1.5 px-4 text-[12px] sm:inline-flex"
              >
                Start recovery
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}

            {/* hamburger — opens the full menu */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className={cn(
                "group relative flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300",
                open
                  ? "border-white/25 bg-white/[0.06] text-white hover:bg-white/[0.12]"
                  : pastHero
                    ? "border-ink/15 bg-ink/[0.04] text-ink hover:border-ink/40 hover:bg-ink/[0.08]"
                    : "border-white/30 bg-white/[0.08] text-white backdrop-blur-md hover:bg-white/[0.16]"
              )}
            >
              <span className="relative block h-3 w-[18px]">
                <span
                  className={cn(
                    "absolute left-0 top-0 block h-[1.5px] w-full rounded-full bg-current transition-all duration-300",
                    open && "top-[5.5px] rotate-45"
                  )}
                />
                <span
                  className={cn(
                    "absolute bottom-0 left-0 block h-[1.5px] w-full rounded-full bg-current transition-all duration-300",
                    open && "bottom-[5.5px] -rotate-45"
                  )}
                />
              </span>
            </button>
          </div>
        </nav>
      </motion.header>

      {/* ================= full-screen menu ================= */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="on-dark fixed inset-0 z-[90] flex flex-col bg-[#0a0d0b]"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            {/* faint atmosphere */}
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(ellipse_60%_100%_at_50%_100%,rgba(45,240,156,0.06),transparent_70%)]" />

            <div className="shell relative flex min-h-0 flex-1 flex-col justify-between pb-8 pt-28 sm:pt-32">
              {/* primary links */}
              <nav aria-label="Menu" className="min-h-0 overflow-y-auto no-scrollbar">
                <ul className="space-y-1 sm:space-y-2">
                  {LINKS.map((l, i) => (
                    <motion.li
                      key={l.href}
                      initial={{ opacity: 0, y: 26 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{
                        delay: 0.06 + i * 0.05,
                        duration: 0.5,
                        ease: [0.2, 1, 0.3, 1],
                      }}
                    >
                      <a
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="group flex items-baseline gap-4 py-1.5 sm:gap-6"
                      >
                        <span className="w-8 shrink-0 font-mono text-[11px] tracking-[0.14em] text-mint/60 transition-colors group-hover:text-mint">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex flex-1 flex-wrap items-baseline justify-between gap-x-6 border-b border-white/[0.07] pb-3 transition-colors group-hover:border-white/20">
                          <span className="font-display text-[1.7rem] font-semibold leading-tight tracking-[-0.02em] text-[#f2f4ef] transition-transform duration-300 group-hover:translate-x-1.5 sm:text-[2.3rem]">
                            {l.label}
                          </span>
                          <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/35 sm:block">
                            {l.note}
                          </span>
                        </span>
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              {/* actions + meta */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.4, duration: 0.5, ease: [0.2, 1, 0.3, 1] }}
                className="mt-10 flex flex-col gap-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/onboarding"
                    onClick={() => setOpen(false)}
                    className="btn-mint h-12 flex-1 justify-center px-7 sm:flex-none sm:px-9"
                  >
                    Start recovery
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/console"
                    onClick={() => setOpen(false)}
                    className="btn-glass h-12 flex-1 justify-center px-7 sm:flex-none sm:px-9"
                  >
                    Open the live console
                  </Link>
                </div>

                {/* auth-aware secondary actions */}
                {!authLoading && (
                  <div className="flex flex-wrap items-center gap-4">
                    {user ? (
                      <>
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/45">
                          signed in · {user.email}
                        </span>
                        <button
                          onClick={async () => {
                            await fetch("/api/auth/logout", { method: "POST" });
                            setUser(null);
                            setOpen(false);
                          }}
                          className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:text-mint"
                        >
                          <LogOut className="h-3.5 w-3.5" /> Sign out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:text-mint"
                        >
                          <LogIn className="h-3.5 w-3.5" /> Sign in
                        </Link>
                        <Link
                          href="/signup"
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/70 transition-colors hover:text-mint"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Create account
                        </Link>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-white/[0.08] pt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                  <span className="flex items-center gap-2.5">
                    <LogoMark className="h-4 w-4 text-mint/70" />
                    Built on the MSMED Act, 2006
                  </span>
                  <span>₹0 upfront · paid only from recovery</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
