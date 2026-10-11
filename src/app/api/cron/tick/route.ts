import { NextResponse } from "next/server";
import { prisma, buildStatutoryNotice, daysOverdue, invoiceInterest } from "@/lib/recovery";
import { audit, AUDIT } from "@/lib/auth";

/**
 * GET/POST /api/cron/tick?secret=...
 * The reminder engine. Scans every org for invoices whose §15 term has
 * just broken and queues the multi-channel reminder ladder (email →
 * WhatsApp → SMS → rPAD). Idempotent: an invoice already in 'reminder_sent'
 * or beyond is skipped. In production this is hit every 15 minutes by a
 * scheduler; here it also runs from the console "Run reminder tick" button.
 */
const REMINDER_LADDER = [
  { channel: "email", kind: "pre_45", offset: 0, subject: "Reminder — invoice approaching the 45-day term", body: "Friendly heads-up: this invoice is approaching the statutory 45-day payment term under §15 of the MSMED Act, 2006. Please remit before the term expires to avoid §16 compound interest." },
  { channel: "email", kind: "statutory", offset: 1, subject: "", body: "" }, // filled from buildStatutoryNotice
  { channel: "whatsapp", kind: "escalation", offset: 0, subject: "Escalation — statutory demand served", body: "A statutory demand under §16 of the MSMED Act has been served. Please contact us immediately to settle." },
  { channel: "sms", kind: "hearing", offset: 0, subject: "MSEFC hearing scheduled", body: "Your ODR reference has been admitted. Hearing details to follow." },
];

async function runTick() {
  const orgs = await prisma.org.findMany({ select: { id: true, name: true } });
  const now = new Date();
  let scanned = 0;
  let queued = 0;
  let promoted = 0;
  const perOrg: { org: string; queued: number; promoted: number }[] = [];

  for (const org of orgs) {
    let orgQueued = 0;
    let orgPromoted = 0;
    // invoices still in 'watch' that have crossed day 45 → auto-serve statutory ladder
    const dueWatch = await prisma.invoice.findMany({
      where: { orgId: org.id, status: "watch" },
      include: { buyer: true },
    });
    for (const inv of dueWatch) {
      scanned++;
      const od = daysOverdue({ dueOn: inv.dueOn }, now);
      if (od <= 0) continue;
      // has a statutory reminder already been queued for this invoice?
      const existing = await prisma.reminder.findFirst({
        where: { invoiceId: inv.id, kind: "statutory" },
      });
      if (existing) continue;

      const notice = buildStatutoryNotice({
        supplierName: org.name,
        buyerName: inv.buyer.name,
        invoiceNumber: inv.number,
        amount: inv.amount,
        issuedOn: inv.issuedOn,
        dueOn: inv.dueOn,
        now,
      });
      await prisma.reminder.create({
        data: { invoiceId: inv.id, channel: "email", kind: "statutory", subject: notice.subject, body: notice.body, status: "queued" },
      });
      await prisma.reminder.create({
        data: { invoiceId: inv.id, channel: "whatsapp", kind: "escalation", subject: REMINDER_LADDER[2].subject, body: REMINDER_LADDER[2].body, status: "queued" },
      });
      // promote invoice to reminder_sent so the pipeline reflects reality
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: "reminder_sent" } });
      await prisma.event.create({
        data: { orgId: org.id, invoiceId: inv.id, type: "notice", title: `Reminder tick: statutory demand queued for ${inv.buyer.name}`, detail: `Auto-detected day-${od} default · email + WhatsApp queued · ₹${Math.round(notice.totalDue).toLocaleString("en-IN")} claimable` },
      });
      orgQueued += 2;
      orgPromoted++;
      queued += 2;
      promoted++;
    }
    if (orgQueued > 0) perOrg.push({ org: org.name, queued: orgQueued, promoted: orgPromoted });
  }

  // best-effort audit against the first org (cron is cross-org)
  if (orgs[0]) await audit(orgs[0].id, "system", AUDIT.CRON_TICK, { scanned, queued, promoted, orgs: orgs.length });

  return { scanned, queued, promoted, perOrg, ranAt: now.toISOString() };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  // if a secret is configured, require it; otherwise allow (sandbox/dev)
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runTick();
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[cron/tick] failed", e);
    return NextResponse.json({ error: e?.message ?? "tick failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
