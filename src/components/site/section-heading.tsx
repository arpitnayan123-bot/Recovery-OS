"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The one canonical section header.
 * Left column: eyebrow (index + kicker) and title.
 * Right column: lede, bottom-aligned. Everything sits on the same grid.
 */
export function SectionHeading({
  index,
  kicker,
  title,
  lede,
  stacked = false,
  className,
}: {
  index: string;
  kicker: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  stacked?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.2, 1, 0.3, 1] }}
      className={cn(
        stacked ? "max-w-xl" : "grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10",
        className
      )}
    >
      <div className={cn(!stacked && "lg:col-span-7")}>
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em]">
          <span className="text-mint">{index}</span>
          <span className="h-px w-8 bg-mint/40" />
          <span className="text-muted-foreground">{kicker}</span>
        </div>
        <h2 className="mt-6 max-w-[15ch] font-display text-[2.1rem] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[2.7rem] lg:text-[3rem]">
          {title}
        </h2>
      </div>
      {lede && (
        <div className={cn(!stacked && "lg:col-span-5", stacked && "mt-5")}>
          <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground lg:pb-1.5">
            {lede}
          </p>
        </div>
      )}
    </motion.div>
  );
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.2, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
