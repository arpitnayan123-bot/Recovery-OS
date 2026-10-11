"use client";

import { useEffect, useMemo, useState } from "react";
import { useSpring, useMotionValueEvent } from "framer-motion";
import { ArrowRight, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { SectionHeading, Reveal } from "./section-heading";
import { inr, formatIndian, statutoryInterest, DEFAULT_BANK_RATE } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ------------------------------ animated number ----------------------------- */

function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const spring = useSpring(value, { stiffness: 140, damping: 24, mass: 0.6 });
  const [display, setDisplay] = useState(value);
  useEffect(() => spring.set(value), [value, spring]);
  useMotionValueEvent(spring, "change", (v) => setDisplay(v as number));
  return (
    <span className={cn("tabular-nums", className)}>
      {format(Math.max(0, Math.round(display)))}
    </span>
  );
}

/* --------------------------------- log slider -------------------------------- */

const AMOUNT_MIN = 25000;
const AMOUNT_MAX = 10000000;

function amountFromPos(pos: number): number {
  const t = pos / 100;
  const raw = Math.exp(Math.log(AMOUNT_MIN) + t * (Math.log(AMOUNT_MAX) - Math.log(AMOUNT_MIN)));
  if (raw < 100000) return Math.round(raw / 1000) * 1000;
  if (raw < 1000000) return Math.round(raw / 5000) * 5000;
  return Math.round(raw / 25000) * 25000;
}

/* ---------------------------------- milestone -------------------------------- */

function milestone(days: number): { label: string; cls: string } {
  if (days < 90)
    return {
      label: "Statutory default — §16 interest is compounding against the buyer",
      cls: "border-flare/30 bg-flare/[0.06] text-flare",
    };
  if (days < 180)
    return {
      label: "MSEFC-eligible — file now; the council must rule within 90 days",
      cls: "border-mint/30 bg-mint/[0.06] text-mint",
    };
  return {
    label: "Deep default — with §19's 75% appeal deposit, valid claims rarely get contested",
    cls: "border-mint/40 bg-mint/[0.08] text-mint",
  };
}

/* ---------------------------------- section ---------------------------------- */

function SliderBlock({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  minLabel,
  maxLabel,
  foot,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
  minLabel: string;
  maxLabel: string;
  foot?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </label>
        <span className="font-mono text-[15px] font-medium text-foreground tabular-nums">
          {display}
        </span>
      </div>
      <Slider
        id={id}
        className="mt-3.5"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        aria-label={label}
      />
      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground/60">
        <span>{minLabel}</span>
        <span>{foot ?? maxLabel}</span>
      </div>
    </div>
  );
}

export function Calculator() {
  const [pos, setPos] = useState(42);
  const [days, setDays] = useState(148);
  const [bankRate, setBankRate] = useState(DEFAULT_BANK_RATE);

  const amount = useMemo(() => amountFromPos(pos), [pos]);
  const { interest, totalDue, annualPct } = useMemo(
    () => statutoryInterest(amount, days, bankRate),
    [amount, days, bankRate]
  );
  const principalPct = totalDue > 0 ? (amount / totalDue) * 100 : 100;
  const ms = milestone(days);

  return (
    <section id="calculator" className="section relative bg-[#f1f0e9]">
      <div className="shell">
        <SectionHeading
          index="04"
          kicker="Interest engine"
          title={
            <>
              The math your buyer{" "}
              <span className="text-flare">doesn&rsquo;t want you to run.</span>
            </>
          }
          lede={
            <>
              Every overdue invoice is quietly accruing penalty interest by statute. Drag the
              sliders to see what the law says a real invoice is worth today.
            </>
          }
        />

        <Reveal delay={0.08} className="mt-12">
          <div className="card overflow-hidden">
            <div className="grid lg:grid-cols-2">
              {/* inputs */}
              <div className="space-y-8 border-b border-border/60 p-6 sm:p-8 lg:border-b-0 lg:border-r">
                <SliderBlock
                  id="sl-amount"
                  label="Invoice value"
                  value={pos}
                  min={0}
                  max={100}
                  step={1}
                  onChange={setPos}
                  display={inr(amount)}
                  minLabel="₹25,000"
                  maxLabel="₹1 crore"
                />

                <SliderBlock
                  id="sl-days"
                  label="Days overdue (beyond day 45)"
                  value={days}
                  min={45}
                  max={730}
                  step={1}
                  onChange={setDays}
                  display={`${days} days`}
                  minLabel="day 45"
                  maxLabel="2 years late"
                />

                <SliderBlock
                  id="sl-rate"
                  label="RBI bank rate (p.a.)"
                  value={bankRate}
                  min={4}
                  max={12}
                  step={0.25}
                  onChange={setBankRate}
                  display={`${bankRate.toFixed(2)}%`}
                  minLabel="4.00%"
                  foot={
                    <>
                      you recover{" "}
                      <span className="text-mint">{(bankRate * 3).toFixed(2)}% p.a.</span> — 3×,
                      compounding monthly
                    </>
                  }
                />

                <div className="flex items-start gap-2.5 rounded-xl border border-ink/[0.08] bg-white/70 p-4">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-mint/70" />
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    Illustrative computation under §16, MSMED Act 2006: 3× the bank rate notified
                    by RBI, compounded with monthly rests. Recovery OS computes and claims this for
                    every eligible invoice.
                  </p>
                </div>
              </div>

              {/* outputs */}
              <div className="flex flex-col p-6 sm:p-8">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                  Statutory interest accrued
                </div>
                <div className="mt-2 font-display text-[2.6rem] font-semibold leading-none tracking-tight text-mint sm:text-[3.1rem]">
                  <AnimatedNumber value={interest} format={(n) => inr(n)} />
                </div>
                <div className="mt-2 font-mono text-[11px] text-muted-foreground/70">
                  ≈ {inr(days > 0 ? interest / days : 0)} per day of delay · {annualPct.toFixed(2)}%
                  p.a.
                </div>

                <div className="mt-8 border-t border-border/60 pt-6">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                    Total now legally recoverable
                  </div>
                  <div className="mt-2 font-display text-[1.9rem] font-semibold leading-none tracking-tight sm:text-[2.2rem]">
                    <AnimatedNumber value={totalDue} format={(n) => inr(n)} />
                  </div>
                </div>

                {/* split bar */}
                <div className="mt-7">
                  <div className="flex h-2.5 w-full gap-px overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-l-full bg-ink/20 transition-all duration-500"
                      style={{ width: `${principalPct}%` }}
                    />
                    <div
                      className="h-full rounded-r-full bg-mint transition-all duration-500"
                      style={{ width: `${100 - principalPct}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
                    <span>principal {formatIndian(principalPct, 1)}%</span>
                    <span className="text-mint">§16 interest {formatIndian(100 - principalPct, 1)}%</span>
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-7 rounded-lg border px-4 py-3 font-mono text-[11.5px] leading-relaxed transition-colors",
                    ms.cls
                  )}
                >
                  {ms.label}
                </div>

                <div className="mt-auto pt-7">
                  <a href="/onboarding" className="btn-primary group w-full sm:w-auto">
                    Recover this invoice
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
