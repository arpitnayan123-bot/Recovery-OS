"use client";

import { useState } from "react";
import { ArrowRight, Check, ShieldCheck, Building2 } from "lucide-react";
import { SectionHeading, Reveal } from "./section-heading";
import { inr, formatIndian } from "@/lib/format";

const INCLUDED = [
  "Invoice monitoring against the §15 clock",
  "Statutory notices & escalation sequences",
  "Evidence pack assembled to MSEFC standard",
  "ODR / MSEFC filing handled end-to-end",
  "90-day deadline managed like a project plan",
  "Government & portal fees included",
];

export function Pricing() {
  const [recovered, setRecovered] = useState(1000000);
  const fee = Math.round(recovered * 0.125);
  const keep = recovered - fee;
  const feePct = 12.5;

  return (
    <section id="pricing" className="section relative">
      <div className="shell">
        <SectionHeading
          index="05"
          kicker="Pricing"
          title={
            <>
              You pay from recovered money.{" "}
              <span className="text-ink/35">Not from capital.</span>
            </>
          }
          lede={
            <>
              A single success fee on every rupee we collect. If we recover nothing, you owe
              nothing. The incentives point exactly one way — at your money.
            </>
          }
        />

        <div className="mt-16 grid gap-5 lg:grid-cols-12">
          {/* recovery engine — the dark feature card */}
          <Reveal className="lg:col-span-7">
            <div className="on-dark flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0b0e0c] p-6 text-[#f2f4ef] shadow-[0_2px_6px_rgba(16,20,19,0.08),0_40px_80px_-40px_rgba(16,20,19,0.45)] sm:p-9">
              <div className="pointer-events-none absolute" aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/[0.08] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mint">
                  Recovery engine
                </span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/40">
                  For MSME suppliers
                </span>
              </div>

              <div className="mt-8 flex items-baseline gap-4">
                <span className="font-display text-[3.6rem] font-semibold leading-none tracking-tight text-mint sm:text-[4.4rem]">
                  ₹0
                </span>
                <span className="text-[14px] leading-snug text-white/55">
                  upfront. No subscription.
                  <br />
                  No filing fees. No retainer.
                </span>
              </div>

              <p className="mt-7 max-w-lg text-[14px] leading-relaxed text-white/60">
                A flat <span className="font-medium text-white">12.5% success fee</span> on
                every rupee actually recovered — interest included, which means the statute usually
                pays our fee for you. Volume discounts kick in as recovered value grows.
              </p>

              {/* split interactive */}
              <div className="mt-8 rounded-xl border border-white/[0.09] bg-white/[0.04] p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
                    Example recovery
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-white/75">
                    {inr(recovered)} recovered
                  </span>
                </div>
                <input
                  type="range"
                  min={200000}
                  max={10000000}
                  step={50000}
                  value={recovered}
                  onChange={(e) => setRecovered(Number(e.target.value))}
                  className="mt-4 w-full cursor-pointer accent-[#2df09c]"
                  aria-label="Recovered amount"
                />
                <div className="mt-5">
                  <div className="flex h-9 w-full overflow-hidden rounded-full font-mono text-[11px]">
                    <div
                      className="flex items-center justify-center bg-mint font-semibold text-[#04140b] transition-all duration-300"
                      style={{ width: `${87.5}%` }}
                    >
                      {formatIndian(87.5, 1)}% yours
                    </div>
                    <div
                      className="flex items-center justify-center bg-mint/15 text-mint transition-all duration-300"
                      style={{ width: `${feePct}%` }}
                    >
                      {formatIndian(feePct, 1)}%
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/45">
                        You keep
                      </div>
                      <div className="mt-1 font-mono text-xl font-medium tabular-nums">
                        {inr(keep)}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/45">
                        Recovery OS fee
                      </div>
                      <div className="mt-1 font-mono text-xl font-medium text-mint tabular-nums">
                        {inr(fee)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <ul className="mt-8 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {INCLUDED.map((i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-white/75">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                    {i}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-9">
                <a href="/onboarding" className="btn-mint group h-12 px-8">
                  Start recovery
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </Reveal>

          {/* buyer compliance */}
          <Reveal delay={0.1} className="lg:col-span-5">
            <div className="card card-hover flex h-full flex-col p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="chip-flare">Compliance OS</span>
                <span className="chip">Coming soon</span>
              </div>

              <div className="mt-8 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-flare/25 bg-flare/[0.08]">
                  <ShieldCheck className="h-5 w-5 text-flare" />
                </div>
                <h3 className="font-display text-[1.35rem] font-semibold leading-snug tracking-tight">
                  For large buyers:
                  <br />
                  never touch the blacklist.
                </h3>
              </div>

              <p className="mt-5 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">
                Delayed-payment cases now surface in public MSME Samadhaan records — and
                government procurement screens for them. Compliance OS watches every vendor invoice
                against the 45-day rule, escalates internally before §16 interest attaches, and
                keeps your procurement standing spotless.
              </p>

              <ul className="mt-7 space-y-3 border-t border-ink/[0.08] pt-6">
                {[
                  "Vendor-wise 45-day exposure dashboard",
                  "Auto-escalation before statutory default",
                  "MSME Samadhaan / blacklist risk radar",
                  "Audit-ready compliance reports for tenders",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-foreground/75">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-flare/70" />
                    {i}
                  </li>
                ))}
              </ul>

              <a
                href="/onboarding"
                className="group mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-flare hover:underline"
              >
                Join the waitlist
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
