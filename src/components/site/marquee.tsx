"use client";

const ITEMS = [
  "45-day statutory clock",
  "3× interest · monthly rests",
  "MSEFC ruling in 90 days",
  "75% deposit to appeal",
  "Claims filed on ODR portal",
  "Evidence auto-assembled",
  "₹0 upfront",
  "Paid only on recovery",
];

export function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div
      className="relative overflow-hidden border-y border-ink/[0.08] bg-[#f2f1ea] py-3.5"
      aria-hidden="true"
    >
      <div className="flex w-max animate-marquee-x mask-fade-x">
        {row.map((item, i) => (
          <span key={i} className="flex items-center whitespace-nowrap">
            <span className="px-7 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink/45">
              {item}
            </span>
            <span className="text-[9px] text-mint/50">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
