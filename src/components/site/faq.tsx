"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeading, Reveal } from "./section-heading";

const FAQS = [
  {
    q: "Is this legal? Are you lawyers?",
    a: "We are an operations platform, not a law firm. Every right we exercise — penalty interest under §16, claims before the MSEFC under §18 — is a right the MSMED Act, 2006 already grants your business by statute. We operationalise it under your authorisation, using empanelled professionals for filings and representation. Nothing here is legal advice for your specific dispute; where a matter needs counsel, we help you brief one.",
  },
  {
    q: "Won't this burn my buyer relationship?",
    a: "The sequence is escalation first, litigation last. Recovery OS starts with precisely-worded statutory notices that signal you know exactly what the law provides — most buyers settle at or before conciliation once §16 interest makes every week of delay expensive. You approve every escalation level, and you can pause the machine on any buyer at any time.",
  },
  {
    q: "What do you need from me to start?",
    a: "Three things: read-only access to your invoicing data (Tally, Zoho, Busy, or even Excel exports), your Udyam registration number, and delivery evidence for the invoices you want pursued. We assemble the full evidence pack — purchase orders, challans, GST ledgers, interest computations — to MSEFC standard ourselves.",
  },
  {
    q: "What if I'm not registered on Udyam?",
    a: "MSMED Act protections apply to registered micro and small enterprises, so registration is the entry gate. Registration is free and takes minutes on the Udyam portal. We flag which of your buyers and invoices qualify once you're registered, and the engine takes over from there.",
  },
  {
    q: "How fast will I actually see money?",
    a: "The statute is unusually fast: the MSEFC must decide a claim within 90 days of filing, and appeals require the buyer to deposit 75% of the award upfront. In practice, a large share of recoveries resolve earlier — at the statutory notice or conciliation stage — because a papered claim with accruing interest changes the buyer's arithmetic.",
  },
  {
    q: "What does it cost if nothing is recovered?",
    a: "Zero. No success fee, no filing fees, no subscription. Our entire model is a percentage of money actually recovered and remitted to you — which is why we only pursue claims the evidence supports.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="section relative bg-[#f1f0e9]">
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              index="06"
              kicker="FAQ"
              stacked
              title={
                <>
                  Questions,{" "}
                  <span className="text-muted-foreground/50">answered straight.</span>
                </>
              }
              lede="The questions every MSME owner asks before switching the machine on."
            />
          </div>
          <Reveal delay={0.08} className="lg:col-span-7">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-border/70">
                  <AccordionTrigger className="py-6 text-left font-display text-[16px] font-medium tracking-tight hover:text-mint hover:no-underline">
                    <span className="flex items-baseline gap-4">
                      <span className="font-mono text-[11px] text-mint/60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {f.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pl-8 text-[13.5px] leading-relaxed text-muted-foreground sm:pl-9">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
