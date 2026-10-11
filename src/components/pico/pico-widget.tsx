"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Volume2, VolumeX, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// dynamically import Pico with ssr:false (avatar runtime is browser-only)
const Pico = dynamic(
  () => import("@/components/cloudee/pico.index").then((m) => m.default),
  { ssr: false, loading: () => <div className="h-[72px] w-[72px]" /> },
);

type ChatMsg = { role: "user" | "pico"; text: string };

const SUGGESTIONS = [
  "What does Recovery OS do?",
  "How does §16 interest work?",
  "Show me my recovery pipeline",
  "What's the MSMED Act?",
];

const SYSTEM_PROMPT = `You are Pico, the friendly mascot and guide for Recovery OS — an Indian MSME statutory-recovery fintech (MSMED Act 2006). You're a helpful cloud companion who explains the product in simple terms. Keep answers short (2-4 sentences), friendly, and grounded in the MSMED Act. You can mention: §15 (45-day payment term), §16 (compound interest at 3× bank rate), §18 (MSEFC filing), §19 (75% deposit for appeal). Be warm and conversational.`;

/**
 * Pico — the always-present, draggable mascot with chat + voice.
 * Renders on every page (homepage, login, signup, console).
 * Can be dragged anywhere, opened into a chat panel, and muted/unmuted.
 */
export function PicoWidget() {
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hasNew, setHasNew] = useState(true);
  const [animation, setAnimation] = useState("idle");

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  // restore position + muted state from localStorage
  useEffect(() => {
    const savedPos = localStorage.getItem("pico-pos");
    if (savedPos) try { setPos(JSON.parse(savedPos)); } catch {}
    const savedMuted = localStorage.getItem("pico-muted");
    if (savedMuted === "1") setMuted(true);
  }, []);

  // persist position
  useEffect(() => {
    localStorage.setItem("pico-pos", JSON.stringify(pos));
  }, [pos]);

  // persist muted
  useEffect(() => {
    localStorage.setItem("pico-muted", muted ? "1" : "0");
  }, [muted]);

  // auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- drag logic ----
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: posRef.current.x,
      origY: posRef.current.y,
      moved: false,
    };
    setDragging(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    const newX = Math.max(0, Math.min(window.innerWidth - 80, dragRef.current.origX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 80, dragRef.current.origY + dy));
    setPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragRef.current) return;
    const wasDrag = dragRef.current.moved;
    dragRef.current = null;
    setDragging(false);
    // if it was a tap (not a drag), toggle chat
    if (!wasDrag) {
      setChatOpen((v) => !v);
      setHasNew(false);
    }
  }, []);

  // ---- TTS ----
  const speak = useCallback((text: string) => {
    if (muted || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    utter.pitch = 1.2;
    utter.volume = 0.8;
    window.speechSynthesis.speak(utter);
  }, [muted]);

  // stop speaking when muted
  useEffect(() => {
    if (muted && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [muted]);

  // ---- chat ----
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setLoading(true);
    setAnimation("thinking");

    try {
      const res = await fetch("/api/pico/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: messages.slice(-6) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Chat failed");
      const reply = data.reply ?? "Sorry, I didn't catch that. Could you rephrase?";
      setMessages((prev) => [...prev, { role: "pico", text: reply }]);
      setAnimation("happy");
      speak(reply);
    } catch {
      const fallback = "I'm having trouble connecting right now. Try again in a moment?";
      setMessages((prev) => [...prev, { role: "pico", text: fallback }]);
      setAnimation("sad");
    } finally {
      setLoading(false);
      setAnimation("idle");
    }
  }, [loading, messages, speak]);

  // cleanup TTS on unmount
  useEffect(() => () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  // clamp position on resize
  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        x: Math.max(0, Math.min(window.innerWidth - 80, p.x)),
        y: Math.max(0, Math.min(window.innerHeight - 80, p.y)),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      {/* ===== floating Pico avatar (always present, draggable) ===== */}
      <motion.div
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 9999,
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="select-none"
      >
        {/* mint glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-mint/15 blur-xl" />
        {/* the 3D avatar */}
        <Pico animation={animation as any} playing size={72} />
        {/* new-message indicator */}
        {hasNew && !chatOpen && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-mint text-[8px] font-bold text-[#04140b]">
            !
          </span>
        )}
        {/* tap hint */}
        {!chatOpen && !hasNew && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-card/90 px-2 py-0.5 font-mono text-[7px] tracking-[0.1em] uppercase text-muted-foreground backdrop-blur-sm">
            tap to chat
          </span>
        )}
      </motion.div>

      {/* ===== chat panel ===== */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2, ease: [0.2, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              left: Math.min(pos.x, (typeof window !== "undefined" ? window.innerWidth : 1440) - 340),
              top: Math.max(10, pos.y - 420),
              zIndex: 9999,
            }}
            className="w-[320px] overflow-hidden rounded-2xl border border-border bg-[#0b0e0c] shadow-2xl"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-mint/30 bg-mint/10 text-mint">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="font-display text-[13px] font-semibold">Pico</p>
                  <p className="font-mono text-[8px] tracking-[0.12em] uppercase text-mint">your recovery guide</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* mute/unmute */}
                <button
                  onClick={() => setMuted((m) => !m)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-mint"
                  aria-label={muted ? "Unmute Pico" : "Mute Pico"}
                  title={muted ? "Unmute voice" : "Mute voice"}
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
                {/* close */}
                <button
                  onClick={() => setChatOpen(false)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Close chat"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* messages */}
            <div className="max-h-[280px] space-y-2.5 overflow-y-auto p-4" style={{ scrollbarWidth: "thin" }}>
              {messages.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-[12.5px] text-muted-foreground">Hi! I'm Pico 👋<br />Ask me anything about Recovery OS, the MSMED Act, or your recovery pipeline.</p>
                  <div className="mt-3 space-y-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="block w-full rounded-lg border border-border bg-secondary/30 px-2.5 py-1.5 text-left text-[11.5px] text-muted-foreground transition-colors hover:border-mint/30 hover:text-mint"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed",
                      m.role === "user"
                        ? "bg-mint/15 text-foreground"
                        : "bg-secondary/50 text-foreground/90",
                    )}>
                      {m.text}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl bg-secondary/50 px-3 py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-mint" />
                    <span className="text-[11px] text-muted-foreground">Pico is thinking…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* input */}
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
                  placeholder="Ask Pico…"
                  className="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-[12.5px] outline-none placeholder:text-muted-foreground/50 focus:border-mint/40"
                />
                <button
                  onClick={() => send(input)}
                  disabled={loading || !input.trim()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-mint text-[#04140b] transition-colors hover:bg-[#4df7ae] disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1.5 flex items-center gap-1 font-mono text-[8px] tracking-[0.1em] uppercase text-muted-foreground/50">
                {muted ? <VolumeX className="h-2.5 w-2.5" /> : <Volume2 className="h-2.5 w-2.5" />}
                voice {muted ? "muted" : "on"} · drag Pico to move
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
