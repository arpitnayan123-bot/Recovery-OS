"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { SectionHeading, Reveal } from "./section-heading";
import { formatIndian, inr, statutoryInterest } from "@/lib/format";
import { cn } from "@/lib/utils";

/* -------------------------------- count-up ---------------------------------- */

function CroreCounter() {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  const [val, setVal] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, 800000, {
      duration: reduced ? 0.01 : 2.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduced]);

  return (
    <span ref={ref} className="tabular-nums">
      ₹{formatIndian(val)}
      <span className="text-[0.5em] text-muted-foreground"> CR</span>
    </span>
  );
}

/* --------------------------- aging invoice widget ---------------------------- */

type Phase = {
  label: string;
  note: string;
  tone: "ok" | "warn" | "hot" | "bad";
};

const PHASES: Array<{ from: number; phase: Phase }> = [
  {
    from: 0,
    phase: { label: "Within terms", note: "Buyer: \u201cpayment next week, promise.\u201d", tone: "ok" },
  },
  {
    from: 45,
    phase: {
      label: "Statutory default — §16 clock starts",
      note: "Interest at 3× the bank rate attaches automatically. No reminder needed, no grace period.",
      tone: "warn",
    },
  },
  {
    from: 90,
    phase: {
      label: "MSEFC-eligible",
      note: "The tribunal must decide your claim within 90 days of filing. Most buyers never reach this fight.",
      tone: "hot",
    },
  },
  {
    from: 180,
    phase: {
      label: "Six months unpaid",
      note: "You are now financing your largest customer at 0%, while your bank charges you 18% for working capital.",
      tone: "bad",
    },
  },
  {
    from: 365,
    phase: {
      label: "Written off — in your books",
      note: "Your CA suggests a 30% discount to \u201cclose it out\u201d. It was legally yours at full value, with interest, all along.",
      tone: "bad",
    },
  },
];

function phaseFor(day: number): Phase {
  let out = PHASES[0].phase;
  for (const p of PHASES) if (day >= p.from) out = p.phase;
  return out;
}

const TONE: Record<Phase["tone"], { chip: string; text: string; bar: string }> = {
  ok: { chip: "chip-mint", text: "text-foreground", bar: "bg-moss" },
  warn: { chip: "chip-flare", text: "text-flare", bar: "bg-flare" },
  hot: { chip: "chip-flare", text: "text-flare", bar: "bg-flare" },
  bad: { chip: "chip-alert", text: "text-alert", bar: "bg-alert" },
};

function AgingInvoice() {
  const [day, setDay] = useState(12);
  const reduced = useReducedMotion();
  const LOOP = 16000;
  const principal = 420000;

  useEffect(() => {
    let raf = 0;
    if (reduced) {
      raf = requestAnimationFrame(() => setDay(214));
      return () => cancelAnimationFrame(raf);
    }
    const start = performance.now();
    const easeStops: Array<[number, number]> = [
      [0, 12],
      [0.12, 45],
      [0.3, 90],
      [0.55, 210],
      [0.75, 365],
      [0.88, 402],
      [1, 402],
    ];
    const tick = (now: number) => {
      const t = ((now - start) % LOOP) / LOOP;
      let a = easeStops[0];
      let b = easeStops[easeStops.length - 1];
      for (let i = 0; i < easeStops.length - 1; i++) {
        if (t >= easeStops[i][0] && t <= easeStops[i + 1][0]) {
          a = easeStops[i];
          b = easeStops[i + 1];
          break;
        }
      }
      const span = b[0] - a[0] || 1;
      const local = (t - a[0]) / span;
      const eased = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
      setDay(Math.round(a[1] + (b[1] - a[1]) * eased));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const phase = phaseFor(day);
  const tone = TONE[phase.tone];
  const { interest } = statutoryInterest(principal, Math.max(0, day - 45));
  const progress = Math.min(day / 402, 1);

  return (
    <div className="card relative overflow-hidden">
      {/* header row */}
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 sm:px-6">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          Invoice #4021 · aging simulation
        </span>
        <span className="font-mono text-[10.5px] text-muted-foreground/70 tabular-nums">
          principal {inr(principal)}
        </span>
      </div>

      <div className="px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
              Day unpaid
            </div>
            <div
              className={cn(
                "mt-1 font-display text-[3.4rem] font-semibold leading-none tracking-tight tabular-nums transition-colors duration-500",
                tone.text
              )}
            >
              {day}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={cn(
                tone.chip,
                "max-w-[240px] whitespace-normal text-center leading-relaxed transition-colors duration-500"
              )}
            >
              {phase.label}
            </span>
            {day >= 45 && (
              <div key="stamps" className="flex gap-2 animate-stamp-in">
                {day >= 90 && (
                  <span className="rounded border border-flare/50 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-flare">
                    Tribunal-ready
                  </span>
                )}
                <span className="rounded border border-alert/50 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-alert">
                  Overdue
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 h-1 overflow-hidden rounded-full bg-ink/[0.08]">
          <div
            className={cn("h-full rounded-full transition-colors duration-500", tone.bar)}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <p className="mt-5 min-h-[66px] text-[13.5px] leading-relaxed text-muted-foreground">
          {phase.note}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
              §16 interest accrued since day 45
            </div>
            <div className="mt-1 font-mono text-xl font-medium text-flare tabular-nums">
              {inr(interest)}
            </div>
          </div>
          <div className="text-right font-mono text-[10px] leading-relaxed text-muted-foreground/60">
            3× bank rate
            <br />
            compounded monthly
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- section ---------------------------------- */

const FACTS = [
  {
    stat: "45 days",
    text: "is all the law gives a buyer before the penalty clock starts. In practice, MSME suppliers routinely wait 90–180.",
  },
  {
    stat: "0%",
    text: "is what your largest customer pays to hold your money. Your bank charges you 16–20% to bridge the gap.",
  },
  {
    stat: "Days",
    text: "of evidence work — purchase orders, delivery proof, GST records — that a claim needs. So almost nobody files.",
  },
];

export function Problem() {
  return (
    <section id="problem" className="section relative">
      <div className="shell">
        <SectionHeading
          index="01"
          kicker="The problem"
          title={
            <>
              India&rsquo;s MSMEs are sitting on <CroreCounter /> of their own money.
            </>
          }
          lede={
            <>
              You shipped the goods. The buyer booked the revenue. The invoice quietly aged past
              the 45-day statutory limit almost nobody enforces. This is the single largest untapped
              balance sheet in the country.
            </>
          }
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* facts — hairline definition list */}
          <div className="order-2 lg:order-1 lg:col-span-5">
            <dl>
              {FACTS.map((f, i) => (
                <Reveal key={f.stat} delay={i * 0.06}>
                  <div
                    className={cn(
                      "grid grid-cols-[92px_1fr] gap-5 py-5",
                      i > 0 && "border-t border-border/60"
                    )}
                  >
                    <dt className="font-display text-[1.35rem] font-semibold tracking-tight">
                      {f.stat}
                    </dt>
                    <dd className="text-[13.5px] leading-relaxed text-muted-foreground">
                      {f.text}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>
            <Reveal delay={0.22}>
              <div className="card bg-secondary/60 p-5">
                <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                  A 2006 law already hands you a brutal advantage —{" "}
                  <span className="font-medium text-foreground">
                    automatic penalty interest, a fast-track tribunal, and an appeal process priced
                    to hurt buyers.
                  </span>{" "}
                  Almost nobody uses it, because the law doesn&rsquo;t come with an operations
                  team. That&rsquo;s the part we built.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal className="order-1 lg:order-2 lg:col-span-7" delay={0.08}>
            <AgingInvoice />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
