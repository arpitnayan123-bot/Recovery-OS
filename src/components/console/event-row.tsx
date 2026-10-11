"use client";

import { FileText, Eye, Send, FolderCheck, Scale, Gavel, Landmark, Radio, AlarmClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDateTime, rel } from "./kit";

export const EVENT_META: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string; label: string }> = {
  sync: { icon: FileText, tone: "text-muted-foreground border-border bg-secondary", label: "SYNC" },
  detect: { icon: Eye, tone: "text-flare border-flare/30 bg-flare/[0.08]", label: "DETECT" },
  notice: { icon: Send, tone: "text-flare border-flare/30 bg-flare/[0.08]", label: "NOTICE" },
  evidence: { icon: FolderCheck, tone: "text-flare border-flare/30 bg-flare/[0.08]", label: "EVIDENCE" },
  filed: { icon: Scale, tone: "text-mint border-mint/30 bg-mint/[0.08]", label: "FILED" },
  admitted: { icon: Scale, tone: "text-mint border-mint/30 bg-mint/[0.08]", label: "ADMITTED" },
  hearing: { icon: Gavel, tone: "text-mint border-mint/30 bg-mint/[0.08]", label: "HEARING" },
  award: { icon: Landmark, tone: "text-mint border-mint/35 bg-mint/[0.12]", label: "AWARD" },
  recovered: { icon: Landmark, tone: "text-mint border-mint/50 bg-mint/[0.16]", label: "RECOVERED" },
  system: { icon: Radio, tone: "text-muted-foreground border-border bg-secondary", label: "SYSTEM" },
};

export function EventRow({
  event,
  onOpenInvoice,
}: {
  event: { id: string; type: string; title: string; detail?: string | null; createdAt: string | Date; invoice?: { number: string; id: string } | null };
  onOpenInvoice?: (id: string) => void;
}) {
  const meta = EVENT_META[event.type] ?? EVENT_META.system;
  const Icon = meta.icon;
  return (
    <div className="group flex items-start gap-3.5 rounded-lg px-3 py-3 transition-colors hover:bg-secondary/60">
      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border", meta.tone)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug text-foreground">
          {event.title}
          {event.invoice && onOpenInvoice ? (
            <button
              onClick={() => onOpenInvoice(event.invoice!.id)}
              className="ml-2 inline-flex items-center rounded border border-border px-1.5 py-0.5 align-middle font-mono text-[10px] tracking-[0.08em] text-muted-foreground transition-colors hover:border-mint/40 hover:text-mint"
            >
              {event.invoice.number}
            </button>
          ) : null}
        </p>
        {event.detail ? <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{event.detail}</p> : null}
        <p className="mt-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70">
          {meta.label} · {fmtDateTime(event.createdAt)} · {rel(event.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function DeadlineBadge({ daysLeft }: { daysLeft: number }) {
  const tone = daysLeft > 30 ? "text-mint border-mint/35 bg-mint/[0.07]" : daysLeft > 10 ? "text-flare border-flare/35 bg-flare/[0.07]" : "text-alert border-alert/40 bg-alert/[0.08]";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10.5px] tracking-[0.1em] whitespace-nowrap", tone)}>
      <AlarmClock className="h-3 w-3" />
      {daysLeft}d left
    </span>
  );
}
