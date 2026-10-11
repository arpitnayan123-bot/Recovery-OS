"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Radio, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { rel } from "./kit";

type FeedEvent = {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  createdAt: string;
  invoiceNumber?: string | null;
};

const TYPE_TONE: Record<string, string> = {
  sync: "text-mint",
  detect: "text-flare",
  notice: "text-flare",
  evidence: "text-flare",
  filed: "text-mint",
  admitted: "text-mint",
  hearing: "text-mint",
  award: "text-mint",
  recovered: "text-mint",
  system: "text-muted-foreground",
  insight: "text-mint",
  diligence: "text-flare",
  import: "text-mint",
};

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return Date.now();
    return Number(localStorage.getItem("ros-feed-seen")) || Date.now();
  });
  const ref = useRef<HTMLDivElement>(null);
  const prevOpenRef = useRef(false);

  // poll the overview feed every 30s for freshness
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/overview");
        const data = await res.json();
        if (active && data?.feed) setFeed(data.feed as FeedEvent[]);
      } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { active = false; clearInterval(t); };
  }, []);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // mark seen on close (only on the open→closed transition, not every feed update)
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;
    if (wasOpen && !open && feed.length) {
      const now = Date.now();
      // defer the setState so it doesn't run synchronously inside this effect
      requestAnimationFrame(() => {
        setLastSeen(now);
        localStorage.setItem("ros-feed-seen", String(now));
      });
    }
  }, [open, feed.length]);

  const unread = feed.filter((e) => new Date(e.createdAt).getTime() > lastSeen).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/60 text-muted-foreground transition-colors hover:border-mint/40 hover:text-mint"
        aria-label={`Notifications${unread ? ` · ${unread} unread` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-mint px-1 font-mono text-[8.5px] font-bold text-[#04140b]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {feed.length > 0 && unread === 0 && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-mint/60" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.2, 1, 0.3, 1] }}
            className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-border bg-[#0b0e0c] shadow-2xl sm:w-96"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] uppercase text-mint">
                <Radio className="h-3.5 w-3.5" /> Machine feed
              </p>
              {unread > 0 ? (
                <span className="rounded border border-mint/30 bg-mint/[0.08] px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] uppercase text-mint">
                  {unread} new
                </span>
              ) : (
                <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-muted-foreground">all caught up</span>
              )}
            </div>

            {/* feed */}
            <div className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {feed.length === 0 ? (
                <p className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">No events yet — the machine is quiet.</p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {feed.slice(0, 10).map((e) => {
                    const isNew = new Date(e.createdAt).getTime() > lastSeen;
                    const tone = TYPE_TONE[e.type] ?? "text-muted-foreground";
                    return (
                      <li
                        key={e.id}
                        className={cn(
                          "flex gap-3 px-4 py-3 transition-colors hover:bg-secondary/30",
                          isNew && "bg-mint/[0.04]",
                        )}
                      >
                        <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", isNew ? "bg-mint animate-pulse-dot" : "bg-muted-foreground/40")} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] leading-snug text-foreground/90">{e.title}</p>
                          {e.detail && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{e.detail}</p>}
                          <p className="mt-1 flex items-center gap-2 font-mono text-[9px] tracking-[0.1em] uppercase">
                            <span className={tone}>{e.type}</span>
                            <span className="text-muted-foreground/60">· {rel(e.createdAt)}</span>
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* footer */}
            <button
              onClick={() => { setOpen(false); router.push("/console/activity"); }}
              className="flex w-full items-center justify-between border-t border-border px-4 py-2.5 text-[11.5px] text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-mint"
            >
              <span className="font-mono tracking-[0.1em] uppercase">Full activity log</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
