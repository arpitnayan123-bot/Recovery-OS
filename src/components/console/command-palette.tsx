"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, FileText, Building2, Scale, LayoutGrid, CornerDownLeft, ArrowUp, ArrowDown, Esc } from "lucide-react";
import { cn } from "@/lib/utils";

type Result = {
  id: string;
  type: "invoice" | "buyer" | "case" | "page";
  label: string;
  sub: string;
  href: string;
  tone: "mint" | "flare" | "alert" | "muted";
  meta?: string;
};

const TYPE_META: Record<Result["type"], { icon: any; label: string }> = {
  page: { icon: LayoutGrid, label: "Page" },
  invoice: { icon: FileText, label: "Invoice" },
  buyer: { icon: Building2, label: "Buyer" },
  case: { icon: Scale, label: "Case" },
};

const TONE_DOT: Record<string, string> = {
  mint: "bg-mint",
  flare: "bg-flare",
  alert: "bg-alert",
  muted: "bg-muted-foreground",
};

export function CommandPalette({ open: controlledOpen, onOpenChange }: { open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // global Cmd/Ctrl+K to open, Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // focus input on open
  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setResults([]);
    }
  }, [open]);

  // debounced search
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [q, open]);

  // group results by type
  const grouped = useCallback(() => {
    const groups: { type: Result["type"]; items: Result[] }[] = [];
    const order: Result["type"][] = ["page", "invoice", "buyer", "case"];
    for (const t of order) {
      const items = results.filter((r) => r.type === t);
      if (items.length) groups.push({ type: t, items });
    }
    return groups;
  }, [results]);

  const flat = results;

  const go = useCallback((r: Result) => {
    router.push(r.href);
    setOpen(false);
  }, [router]);

  // keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(flat.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter" && flat[active]) {
        e.preventDefault();
        go(flat[active]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, active, go]);

  // scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let runningIdx = -1;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[120] flex items-start justify-center p-4 pt-[12vh]"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ scale: 0.97, y: -8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.97, y: -8, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 1, 0.3, 1] }}
              className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-[#0b0e0c] shadow-2xl"
            >
              {/* search input */}
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search className={cn("h-4 w-4 shrink-0", loading ? "animate-pulse text-mint" : "text-muted-foreground")} />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search invoices, buyers, cases, or jump to a page…"
                  className="h-14 w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/50"
                  autoComplete="off"
                  spellCheck={false}
                />
                <kbd className="hidden shrink-0 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px] tracking-[0.06em] text-muted-foreground sm:block">
                  esc
                </kbd>
              </div>

              {/* results */}
              <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2" style={{ scrollbarWidth: "thin" }}>
                {flat.length === 0 && !loading ? (
                  <div className="px-4 py-10 text-center">
                    <Search className="mx-auto h-6 w-6 text-muted-foreground/40" />
                    <p className="mt-3 text-[13px] text-muted-foreground">
                      {q ? `No results for "${q}"` : "Start typing to search across your workspace"}
                    </p>
                  </div>
                ) : (
                  grouped().map((group) => (
                    <div key={group.type} className="mb-1">
                      <p className="px-4 py-1.5 font-mono text-[9.5px] tracking-[0.16em] uppercase text-muted-foreground/60">
                        {TYPE_META[group.type].label}{group.items.length > 1 ? "s" : ""} · {group.items.length}
                      </p>
                      {group.items.map((item) => {
                        runningIdx++;
                        const idx = runningIdx;
                        const Icon = TYPE_META[group.type].icon;
                        const isActive = idx === active;
                        return (
                          <button
                            key={item.id}
                            data-idx={idx}
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => go(item)}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                              isActive ? "bg-mint/[0.08]" : "hover:bg-secondary/40",
                            )}
                          >
                            <span className={cn(
                              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                              isActive ? "border-mint/30 bg-mint/10 text-mint" : "border-border bg-secondary text-muted-foreground",
                            )}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-foreground">{item.label}</p>
                              <p className="truncate text-[11.5px] text-muted-foreground">{item.sub}</p>
                            </div>
                            {item.meta && (
                              <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{item.meta}</span>
                            )}
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[item.tone])} />
                            {isActive && <CornerDownLeft className="h-3 w-3 shrink-0 text-mint" />}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* footer */}
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 font-mono text-[9.5px] tracking-[0.1em] uppercase text-muted-foreground">
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> navigate</span>
                  <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> open</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse-dot" />
                  recovery os · search
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
