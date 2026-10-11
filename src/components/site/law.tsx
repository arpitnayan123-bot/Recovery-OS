"use client";

import { BookOpenText, ClipboardList, Handshake, Landmark, Percent, Scale } from "lucide-react";
import { SectionHeading, Reveal } from "./section-heading";

const STATUTES = [
  {
    tag: "§ 15",
    icon: Landmark,
    title: "The 45-day clock",
    body: "Any buyer — however large — must pay a registered MSME within 45 days of delivery. \u201cWe\u2019ll pay after our Q4\u201d is not a term the law recognises.",
    ros: "Recovery OS flags every invoice the day it crosses the line. To the hour.",
  },
  {
    tag: "§ 16",
    icon: Percent,
    title: "3× interest, compounding",
    body: "The moment day 45 passes, penalty interest at three times the RBI bank rate — compounded with monthly rests — attaches automatically.",
    ros: "We compute it to the rupee and put it on the table in every notice.",
  },
  {
    tag: "§ 18",
    icon: Scale,
    title: "Tribunal in 90 days",
    body: "The MSEFC — a statutory facilitation council — must resolve your claim within 90 days. Not a 12-year suit; a fast-track lane built for you.",
    ros: "We file on the government ODR portal and run the deadline like a project plan.",
  },
  {
    tag: "§ 19",
    icon: BookOpenText,
    title: "75% to even appeal",
    body: "A buyer who loses at the council must deposit 75% of the award just to be heard on appeal. The law is deliberately expensive to stall.",
    ros: "Which is why a properly papered claim settles long before a hearing.",
  },
];

const FRICTIONS = [
  {
    icon: ClipboardList,
    title: "The paperwork is brutal",
    body: "Purchase orders, delivery challans, GST ledgers, interest computations — days of assembly for someone also running a factory floor.",
  },
  {
    icon: BookOpenText,
    title: "You didn\u2019t know it existed",
    body: "Nine in ten MSME owners have never heard of §16. The law was written in 2006 and never shipped with a user manual.",
  },
  {
    icon: Handshake,
    title: "It feels like suing a customer",
    body: "Suppliers fear torching the relationship. The statute\u2019s first remedies are escalation and conciliation — most claims settle without a fight.",
  },
];

export function Law() {
  return (
    <section id="law" className="on-dark section relative bg-[#0a0d0b] text-[#f2f4ef]">
      {/* atmosphere: quiet grid + one horizon tint */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/[0.06]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(ellipse_55%_100%_at_50%_100%,rgba(45,240,156,0.05),transparent_70%)]" />

      <div className="shell relative">
        <SectionHeading
          index="02"
          kicker="The arsenal"
          title={
            <>
              A 2006 law already fights for you.{" "}
              <span className="text-white/35">It has just been asleep.</span>
            </>
          }
          lede={
            <>
              The MSMED Act doesn&rsquo;t ask buyers to be nice. It makes late payment expensive,
              by statute, by default. Four provisions do almost all of the work.
            </>
          }
        />

        {/* statute grid — one anatomy, hairline-divided */}
        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.09] sm:grid-cols-2 xl:grid-cols-4">
          {STATUTES.map((s, i) => (
            <Reveal key={s.tag} delay={i * 0.05} className="h-full">
              <div className="group flex h-full flex-col bg-[#0d110d] p-6 transition-colors duration-300 hover:bg-[#111611] sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[13px] font-semibold text-mint">{s.tag}</span>
                  <s.icon className="h-4 w-4 text-white/25 transition-colors duration-300 group-hover:text-mint/80" />
                </div>
                <h3 className="mt-6 font-display text-[1.25rem] font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-3 flex-1 text-[13px] leading-relaxed text-white/55">
                  {s.body}
                </p>
                <div className="mt-7 border-t border-white/[0.07] pt-4">
                  <p className="flex gap-2 font-mono text-[11px] leading-relaxed text-mint/85">
                    <span className="shrink-0 text-mint/50">→</span>
                    {s.ros}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* why nobody uses it */}
        <div className="mt-24 sm:mt-28">
          <Reveal>
            <div className="grid gap-6 border-y border-white/[0.08] py-12 lg:grid-cols-12 lg:items-baseline">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45 lg:col-span-3">
                So why is almost nobody using it?
              </p>
              <p className="font-display text-[1.6rem] font-semibold leading-snug tracking-tight sm:text-[2rem] lg:col-span-9">
                The statute was never the missing piece.{" "}
                <span className="text-white/35">
                  The operations team that runs it was.
                </span>
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {FRICTIONS.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.07}>
                <div className="border-t border-alert/40 pt-6">
                  <f.icon className="h-[18px] w-[18px] text-alert/80" />
                  <h4 className="mt-4 font-display text-[1.1rem] font-semibold tracking-tight">
                    {f.title}
                  </h4>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/55">
                    {f.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12}>
            <p className="mt-20 max-w-3xl font-display text-[1.7rem] font-semibold leading-snug tracking-[-0.02em] sm:text-[2.2rem]">
              So we turned the whole arsenal{" "}
              <span className="text-mint">into software.</span>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
