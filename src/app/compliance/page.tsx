"use client";

import { PageHead } from "@/components/console/kit";
import { ShieldCheck, Building2, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

export default function CompliancePage() {
  return (
    <>
      <PageHead
        kicker="Compliance OS · buyer-side · §43B(h)"
        title="MSME Payment Compliance"
        desc="For enterprises that buy from MSMEs — ensure you pay within 45 days to avoid losing your tax deduction under Section 43B(h) of the Income-tax Act, 1961."
      />
      <div className="space-y-6">
        <section className="rounded-xl border border-alert/25 bg-alert/[0.03] p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-alert">
            <AlertTriangle className="h-4 w-4" /> The §43B(h) risk
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            From April 1, 2024, any payment to a micro or small enterprise that isn't made within the MSMED Act's
            45-day term is <span className="font-semibold text-alert">not allowed as a tax deduction</span>. Your CA will disallow
            it during tax filing, increasing your tax liability. Every late MSME payment is a tax time bomb.
          </p>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <ShieldCheck className="h-4 w-4 text-mint" /> What Compliance OS will do
          </h2>
          <ul className="mt-3 space-y-2.5">
            {[
              "Connect to your Tally/ERP and identify all MSME-registered vendors (via Udyam verification)",
              "Flag every MSME invoice approaching the 45-day deadline",
              "Auto-prioritise MSME invoices in your AP queue — pay these first",
              "Generate a §43B(h) compliance report for your CA at quarter-end",
              "Show the tax impact of each late payment before it hits your tax filing",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" /> {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <p className="text-[12.5px] text-muted-foreground">This product is under development.</p>
            <a href="mailto:compliance@recovery-os.in" className="inline-flex items-center gap-1.5 rounded-lg bg-mint px-4 h-9 text-[12.5px] font-semibold text-[#04140b] transition-colors hover:bg-[#4df7ae]">
              Join the waitlist <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
