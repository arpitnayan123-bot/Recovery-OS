"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionHeading, Reveal } from "./section-heading";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";

/* --------------------------------- pipeline --------------------------------- */

const STEPS = [
  {
    n: "01",
    title: "Connect",
    body: "Read-only link to Tally, Zoho, Busy or a spreadsheet. No migration, no new software.",
  },
  {
    n: "02",
    title: "Detect",
    body: "Every invoice is watched against the 45-day §15 clock. The day it breaches, the machinery wakes up.",
  },
  {
    n: "03",
    title: "Demand",
    body: "A statutory notice citing §16 interest goes to the buyer — precise, escalating, impossible to wave away.",
  },
  {
    n: "04",
    title: "File",
    body: "Evidence assembled automatically; the claim is filed on the government ODR portal.",
  },
  {
    n: "05",
    title: "Collect",
    body: "Conciliation, orders, execution — pursued to money-in-account and remitted to you.",
  },
];

function Pipeline() {
  return (
    <div className="mt-16 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
      {STEPS.map((s, i) => (
        <motion.div
          key={s.n}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: i * 0.08, ease: [0.2, 1, 0.3, 1] }}
          className="relative border-t border-ink/15 pt-5"
        >
          <span className="absolute -top-px left-0 h-px w-10 bg-mint" />
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[12px] font-medium text-mint">{s.n}</span>
            {i < STEPS.length - 1 && (
              <span className="font-mono text-[10px] text-ink/30">→</span>
            )}
          </div>
          <h3 className="mt-3 font-display text-[1.1rem] font-semibold tracking-tight">
            {s.title}
          </h3>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{s.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

/* -------------------------------- dashboard --------------------------------- */

type Status = "DEMAND SENT" | "FILED · MSEFC" | "CONCILIATION" | "RECOVERED" | "WATCH";

const STATUS_STYLE: Record<Status, string> = {
  "DEMAND SENT": "text-flare border-flare/35 bg-flare/[0.08]",
  "FILED · MSEFC": "text-ink/70 border-ink/20 bg-ink/[0.04]",
  CONCILIATION: "text-mint border-mint/30 bg-mint/[0.08]",
  RECOVERED: "text-white bg-moss border-moss",
  WATCH: "text-ink/50 border-ink/15 bg-ink/[0.03]",
};

const ROWS: Array<{
  id: string;
  buyer: string;
  amount: number;
  days: number;
  status: Status;
}> = [
  { id: "INV-4021", buyer: "Steelworks India Ltd.", amount: 420000, days: 214, status: "FILED · MSEFC" },
  { id: "INV-3987", buyer: "Apex Auto Components", amount: 184500, days: 63, status: "DEMAND SENT" },
  { id: "INV-3912", buyer: "Ganges Polymers Pvt.", amount: 96800, days: 47, status: "WATCH" },
  { id: "INV-3856", buyer: "Northline Electricals", amount: 732000, days: 118, status: "CONCILIATION" },
  { id: "INV-3745", buyer: "Delta Castings", amount: 251000, days: 0, status: "RECOVERED" },
];

const FEED_POOL = [
  "§16 interest recomputed on INV-4021 → ₹38,914",
  "Buyer acknowledged demand notice · INV-3987",
  "MSEFC hearing reminder filed · INV-4021",
  "GST ledger evidence attached · INV-3856",
  "Conciliation call scheduled · INV-3856",
  "Payment promise logged · INV-3912",
  "ODR portal status polled · all claims green",
  "Remittance processed → ₹2,84,050 settled",
];

function Dashboard() {
  const [feed, setFeed] = useState<string[]>(FEED_POOL.slice(0, 4));
  const [tick, setTick] = useState(214);

  useEffect(() => {
    const id = setInterval(() => {
      setFeed((f) => {
        const next = FEED_POOL[Math.floor(Math.random() * FEED_POOL.length)];
        return [...f.slice(-5), next];
      });
    }, 2600);
    const id2 = setInterval(() => setTick((t) => t + 1), 5200);
    return () => {
      clearInterval(id);
      clearInterval(id2);
    };
  }, []);

  return (
    <div className="card overflow-hidden shadow-[0_2px_6px_rgba(16,20,19,0.05),0_32px_80px_-32px_rgba(16,20,19,0.25)]">
      {/* window chrome */}
      <div className="flex h-12 items-center justify-between border-b border-ink/[0.08] bg-[#faf9f5] px-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-ink/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink/10" />
          </span>
          <span className="ml-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink/50">
            app.recoveryos.in · recovery desk
          </span>
        </div>
        <span className="hidden font-mono text-[10px] text-ink/40 sm:block">
          UDYAM-KR-03-0041234
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_290px]">
        {/* main */}
        <div className="border-b border-ink/[0.07] p-4 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-mono text-[11px] text-ink/55">
              312 invoices monitored · 9 in active recovery
            </div>
            <span className="chip-mint">
              <span className="h-1 w-1 rounded-full bg-mint animate-pulse-dot" />
              Engine armed
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 xl:grid-cols-4 gap-px overflow-hidden rounded-xl border border-ink/[0.08] bg-ink/[0.08]">
            {[
              { k: "Total exposure", v: inr(4264300), cls: "text-foreground" },
              { k: "In active recovery", v: inr(1834300), cls: "text-flare" },
              { k: "§16 interest accrued", v: inr(190300), cls: "text-flare" },
              { k: "Recovered · 12 mo", v: inr(2356900), cls: "text-mint" },
            ].map((c) => (
              <div key={c.k} className="bg-white px-3.5 py-3.5">
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink/45">
                  {c.k}
                </div>
                <div className={cn("mt-1.5 font-mono text-[14px] font-medium tabular-nums", c.cls)}>
                  {c.v}
                </div>
              </div>
            ))}
          </div>

          {/* table */}
          <div className="mt-5 overflow-hidden rounded-xl border border-ink/[0.08]">
            <div className="hidden sm:grid grid-cols-[1fr_1.5fr_1fr_0.6fr_1.1fr] gap-3 border-b border-ink/[0.08] bg-[#faf9f5] px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink/45">
              <span>Invoice</span>
              <span>Buyer</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Age</span>
              <span className="text-right">Status</span>
            </div>
            {ROWS.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-ink/[0.05] px-4 py-3 transition-colors last:border-0 hover:bg-[#faf9f5] sm:grid-cols-[1fr_1.5fr_1fr_0.6fr_1.1fr] sm:gap-3"
              >
                <span className="font-mono text-[11.5px] font-medium text-mint">{r.id}</span>
                <span className="hidden truncate text-[12.5px] text-foreground/85 sm:block">
                  {r.buyer}
                </span>
                <span className="hidden text-right font-mono text-[11.5px] tabular-nums text-foreground/80 sm:block">
                  {inr(r.amount)}
                </span>
                <span className="hidden text-right font-mono text-[11.5px] tabular-nums text-ink/55 sm:block">
                  {r.id === "INV-4021" ? tick : r.days}
                </span>
                <span className="sm:text-right">
                  <span
                    className={cn(
                      "inline-block rounded-full border px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em]",
                      STATUS_STYLE[r.status]
                    )}
                  >
                    {r.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* feed */}
        <div className="flex flex-col p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse-dot" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/50">
              Action log
            </span>
          </div>
          <div className="mt-4 min-h-[180px] flex-1 space-y-3">
            {feed.map((f, i) => (
              <motion.div
                key={f + i + feed.length}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
                className="flex gap-2 font-mono text-[10.5px] leading-relaxed text-ink/70"
              >
                <span className="shrink-0 text-mint/60">→</span>
                {f}
              </motion.div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-mint/25 bg-mint/[0.06] p-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-mint">
              Next automatic action
            </div>
            <div className="mt-1.5 text-[12px] leading-snug text-foreground/85">
              MSEFC hearing brief for INV-4021 — assembled and queued for filing review.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- section ---------------------------------- */

export function Product() {
  return (
    <section id="product" className="section relative">
      <div className="shell">
        <SectionHeading
          index="03"
          kicker="The machine"
          title={
            <>
              One pipeline from <span className="text-ink/35">overdue</span> to paid.
            </>
          }
          lede={
            <>
              Recovery OS is not another dashboard that shows you the problem. It is an operations
              team in software — it detects, escalates, files and collects, and shows its work at
              every step.
            </>
          }
        />

        <Pipeline />

        <Reveal className="mt-16" delay={0.05}>
          <Dashboard />
        </Reveal>

        <Reveal className="mt-10" delay={0.05}>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/onboarding" className="btn-primary group">
              Run it on your ledger
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a href="/console" className="btn-secondary">
              Open the live console
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink/45">
            <span>Read-only integrations</span>
            <span className="text-mint/60">·</span>
            <span>You approve every escalation</span>
            <span className="text-mint/60">·</span>
            <span>Full audit trail</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
