"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, X, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";

type ShortcutGroup = {
  label: string;
  items: { keys: string[]; desc: string }[];
};

const SHORTCUTS: ShortcutGroup[] = [
  {
    label: "Navigation",
    items: [
      { keys: ["⌘", "K"], desc: "Open command palette — search invoices, buyers, cases" },
      { keys: ["?"], desc: "Show this keyboard shortcuts reference" },
      { keys: ["Esc"], desc: "Close any open dialog, drawer, or palette" },
      { keys: ["g", "o"], desc: "Go to Overview" },
      { keys: ["g", "i"], desc: "Go to Invoices" },
      { keys: ["g", "c"], desc: "Go to ODR cases" },
      { keys: ["g", "b"], desc: "Go to Buyers" },
      { keys: ["g", "a"], desc: "Go to Analytics" },
      { keys: ["g", "s"], desc: "Go to AI insights" },
    ],
  },
  {
    label: "Invoices",
    items: [
      { keys: ["↑", "↓"], desc: "Move selection between invoice rows (in palette)" },
      { keys: ["↵"], desc: "Open the highlighted result" },
      { keys: ["n"], desc: "Add a new invoice (on the invoices page)" },
    ],
  },
  {
    label: "Recovery",
    items: [
      { keys: ["⌘", "↵"], desc: "Run the highlighted pipeline action" },
      { keys: ["e"], desc: "Explain forecast in plain English (AI)" },
    ],
  },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ignore when typing in inputs (unless it's Escape)
      const target = e.target as HTMLElement;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (e.key === "Escape") {
        if (open) setOpen(false);
        return;
      }
      if (isTyping) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[120] flex items-start justify-center p-4 pt-[10vh]"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ scale: 0.97, y: -8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.97, y: -8, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 1, 0.3, 1] }}
              className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-[#0b0e0c] shadow-2xl"
            >
              {/* header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-mint/30 bg-mint/10 text-mint">
                    <Keyboard className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight">Keyboard shortcuts</h2>
                    <p className="text-[11.5px] text-muted-foreground">Move through Recovery OS without touching the mouse.</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* groups */}
              <div className="grid gap-6 p-5 sm:grid-cols-3">
                {SHORTCUTS.map((group) => (
                  <div key={group.label}>
                    <p className="mb-3 font-mono text-[9.5px] tracking-[0.18em] uppercase text-mint">{group.label}</p>
                    <ul className="space-y-2.5">
                      {group.items.map((item, i) => (
                        <li key={i} className="flex items-center justify-between gap-2">
                          <span className="text-[12px] leading-snug text-muted-foreground">{item.desc}</span>
                          <span className="flex shrink-0 items-center gap-1">
                            {item.keys.map((k, ki) => (
                              <kbd key={ki} className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] tracking-[0.04em] text-foreground">
                                {k}
                              </kbd>
                            ))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* footer */}
              <div className="flex items-center justify-between border-t border-border px-5 py-3 font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted-foreground">
                <span className="flex items-center gap-2">
                  <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-foreground">esc</kbd>
                  close
                </span>
                <span className="flex items-center gap-2">
                  <CornerDownLeft className="h-3 w-3 text-mint" /> recovery os · keyboard-first
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
