"use client";

import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { PageHead } from "@/components/console/kit";
import { EventRow } from "@/components/console/event-row";

type FeedEvent = {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  createdAt: string;
  invoice?: { number: string; id: string } | null;
};

export default function ActivityPage() {
  const { data, isLoading } = useQuery<{ events: FeedEvent[] }>({
    queryKey: ["events"],
    queryFn: async () => (await fetch("/api/events?take=120")).json(),
  });

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-secondary/50" />;
  }

  return (
    <>
      <PageHead
        kicker="Machine log · append-only"
        title="Activity"
        desc="Every action the engine takes — ingestion, default detection, notices, evidence, filings, hearings, awards, receipts. Timestamped entries double as your audit trail before the council."
      />
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] uppercase text-muted-foreground">
          <Radio className="h-3.5 w-3.5 text-mint animate-pulse-dot" /> live feed · {data.events.length} entries
        </h2>
        <div className="mt-2 divide-y divide-border/50">
          {data.events.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      </section>
    </>
  );
}
