"use client";

import { PageHead } from "@/components/console/kit";
import { Building2, Scale, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LawyersPage() {
  return (
    <>
      <PageHead
        kicker="Advocate network · MSEFC representation"
        title="Find an advocate"
        desc="Connect with lawyers experienced in MSEFC filings and §18 references under the MSMED Act, 2006. (Coming soon — join the waitlist.)"
      />
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Scale className="h-4 w-4 text-mint" /> Why you need an advocate
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            MSEFC references under §18 require representation. Recovery OS builds the evidence pack and filing forms,
            but the actual hearing needs a lawyer. We're building a network of advocates who specialise in MSMED Act cases.
          </p>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Building2 className="h-4 w-4 text-mint" /> What's coming
          </h2>
          <ul className="mt-3 space-y-2.5">
            {[
              "Verified advocates experienced in MSEFC / Samadhaan cases",
              "Fixed-fee representation (no hourly billing surprises)",
              "Direct handoff from Recovery OS (evidence pack + filing forms pre-filled)",
              "10% platform fee on legal fees ( Recovery OS takes a small cut)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" /> {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <p className="text-[12.5px] text-muted-foreground">Want to be listed as an advocate?</p>
            <a href="mailto:advocates@recovery-os.in" className="inline-flex items-center gap-1.5 rounded-lg bg-mint px-4 h-9 text-[12.5px] font-semibold text-[#04140b] transition-colors hover:bg-[#4df7ae]">
              Join the network <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
