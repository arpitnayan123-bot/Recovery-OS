"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogoMark } from "./logo";

const BOOT_LINES = [
  "RECOVERY OS  v2.4.1 — kernel boot",
  "mount /receivables ................ OK",
  "load MSMED_Act_2006.so ............ OK",
  "scan overdue invoices ............. 312 flagged",
  "interest engine (3x bank rate) .... ARMED",
];

export function Preloader() {
  const [done, setDone] = useState(false);
  const [lines, setLines] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("ros-booted")) {
      const raf = requestAnimationFrame(() => setDone(true));
      return () => cancelAnimationFrame(raf);
    }
    const lineTimer = setInterval(() => {
      setLines((n) => Math.min(n + 1, BOOT_LINES.length));
    }, 150);
    const finish = setTimeout(() => {
      sessionStorage.setItem("ros-booted", "1");
      setDone(true);
    }, 1250);
    return () => {
      clearInterval(lineTimer);
      clearTimeout(finish);
    };
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[200] flex cursor-pointer flex-col items-center justify-center bg-background"
          onClick={() => {
            sessionStorage.setItem("ros-booted", "1");
            setDone(true);
          }}
          exit={{ y: "-100%", transition: { duration: 0.55, ease: [0.83, 0, 0.17, 1] } }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-5">
            <LogoMark className="h-12 w-12 text-mint" />
            <div className="w-[320px] max-w-[80vw] font-mono text-[11px] leading-5 text-muted-foreground">
              {BOOT_LINES.slice(0, lines).map((l, i) => (
                <div key={l} className={i === 0 ? "text-mint" : ""}>
                  {l}
                </div>
              ))}
              <span className="inline-block h-3.5 w-2 translate-y-0.5 animate-blink bg-mint/80" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
