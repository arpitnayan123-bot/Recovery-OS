"use client";

import Link from "next/link";
import { Logo } from "./logo";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "The Problem", href: "#problem" },
      { label: "The Law", href: "#law" },
      { label: "The Machine", href: "#product" },
      { label: "Interest Calculator", href: "#calculator" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Pricing", href: "#pricing" },
      { label: "For Large Buyers", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
      { label: "Start recovering", href: "/onboarding" },
      { label: "Live console", href: "/console" },
    ],
  },
  {
    title: "Reference",
    links: [
      { label: "MSMED Act, 2006", href: "https://www.indiacode.nic.in" },
      { label: "MSME ODR Portal", href: "https://odr.msme.gov.in" },
      { label: "Udyam Registration", href: "https://udyamregistration.gov.in" },
      { label: "MSME Samadhaan", href: "https://msmesamadhaan.msme.gov.in" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-auto border-t border-ink/[0.08] bg-[#f1f0e9]">
      <div className="shell py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              The payment-recovery operating system for Indian MSMEs. Built on the statutory rights
              you already have — operated end-to-end so you never have to think about them.
            </p>
            <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
              Made for Indian manufacturing &amp; trade
            </div>
          </div>

          {COLS.map((c) => (
            <div key={c.title}>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-foreground/80">
                {c.title}
              </div>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("http") ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    ) : l.href.startsWith("/") ? (
                      <Link
                        href={l.href}
                        className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        href={l.href}
                        className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-ink/[0.08] pt-6 md:flex-row md:items-center md:justify-between">
          <div className="font-mono text-[10.5px] text-muted-foreground/60">
            © 2026 Recovery OS Technologies Pvt. Ltd. · Bengaluru, India
          </div>
          <div className="max-w-xl font-mono text-[10px] leading-relaxed text-muted-foreground/50 md:text-right">
            Recovery OS is a technology platform, not a law firm; nothing on this site is legal
            advice. Statutory references summarise the MSMED Act, 2006 for information only.
          </div>
        </div>
      </div>
    </footer>
  );
}
