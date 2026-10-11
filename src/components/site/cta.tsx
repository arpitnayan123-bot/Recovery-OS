"use client";

import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./section-heading";

export function Cta() {
  return (
    <section id="cta" className="section relative">
      <div className="shell">
        <Reveal>
          <div className="on-dark relative overflow-hidden rounded-[2rem] bg-[#050706] text-[#f2f4ef] shadow-[0_2px_6px_rgba(16,20,19,0.08),0_48px_100px_-48px_rgba(16,20,19,0.5)] sm:rounded-[2.5rem]">
            {/* film-still backdrop, heavily graded */}
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-45"
              style={{ backgroundImage: "url(/media/hero-poster.jpg)" }}
              aria-hidden="true"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050706] via-[#050706]/78 to-[#050706]/35" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_85%_50%,transparent_20%,rgba(4,6,5,0.5)_100%)]" />

            <div className="relative grid gap-10 p-8 sm:p-14 lg:grid-cols-12 lg:items-center lg:p-20">
              <div className="lg:col-span-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mint">
                  MSMED Act, 2006 · §15–§19 · ODR portal
                </p>
                <h2 className="mt-6 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[3.4rem]">
                  Stop chasing.
                  <br />
                  <span className="text-white/40">Start collecting.</span>
                </h2>
                <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/65">
                  The money is already legally yours — principal, plus interest the buyer has been
                  accruing since day 45. Recovery OS simply goes and gets it.
                </p>
              </div>

              <div className="lg:col-span-5">
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
                  <a href="/onboarding" className="btn-mint group h-12 justify-center px-8">
                    Switch the machine on
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                  <a href="/console" className="btn-glass h-12 justify-center px-8">
                    Open the live console
                  </a>
                </div>
                <p className="mt-6 font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.14em] text-white/45">
                  ₹0 upfront · paid only from what we recover
                  <br />
                  you approve every step
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
