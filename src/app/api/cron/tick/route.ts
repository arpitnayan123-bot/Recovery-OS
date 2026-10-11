import { NextResponse } from "next/server";
import { prisma, buildStatutoryNotice, daysOverdue, invoiceInterest, MSEFC_DECISION_DAYS } from "@/lib/recovery";
import { audit, AUDIT } from "@/lib/auth";

const DAY = 86_400_000;
const MONTHLY = ((5.75 * 3) / 100) / 12; // §16 monthly compound rate

/**
 * GET/POST /api/cron/tick?secret=...
 * The reminder engine. Scans every org for:
 *  1. Invoices whose §15 term has just broken (watch + overdue) → auto-serve
 *     the statutory ladder (email + WhatsApp), respecting DigestPreference
 *     channel toggles and the alertOverdue trigger.
 *  2. ODR cases approaching the 90-day MSEFC decision deadline (≤14 days) →
 *     queue a hearing reminder if alertClockRisk is on.
 *
 * Idempotent: an invoice already past 'watch' or with a statutory reminder
 * already queued is skipped. Respects per-org digest preferences — a channel
 * disabled in settings is never queued for that org.
 */
const WHATSAPP_ESCALATION = {
  subject: "Escalation — statutory demand served",
  body: "A statutory demand under §16 of the MSMED Act has been served. Please contact us immediately to settle.",
};
const SMS_HEARING = {
  subject: "MSEFC hearing reminder",
  body: "Your ODR reference is approaching the 90-day decision deadline. Ensure your evidence is on record.",
};

async function runTick() {
  const orgs = await prisma.org.findMany({ select: { id: true, name: true } });
  const now = new Date();
  let scanned = 0;
  let queued = 0;
  let promoted = 0;
  let clockAlerts = 0;
  let forecastAlerts = 0;
  let demoOrgsDeleted = 0;
  const perOrg: { org: string; queued: number; promoted: number; clockAlerts: number; forecastAlerts?: number }[] = [];

  // Gap 7: Clean up demo orgs older than 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY);
  const oldDemoOrgs = await prisma.org.findMany({
    where: { isDemo: true, createdAt: { lt: sevenDaysAgo } },
    select: { id: true },
  });
  if (oldDemoOrgs.length > 0) {
    await prisma.org.deleteMany({ where: { id: { in: oldDemoOrgs.map((o) => o.id) } } });
    demoOrgsDeleted = oldDemoOrgs.length;
  }

  for (const org of orgs) {
    // load this org's digest preferences (or defaults)
    const prefs = await prisma.digestPreference.findUnique({ where: { orgId: org.id } });
    const emailOn = prefs?.emailEnabled ?? true;
    const whatsappOn = prefs?.whatsappEnabled ?? false;
    const smsOn = prefs?.smsEnabled ?? false;
    const alertOverdue = prefs?.alertOverdue ?? true;
    const alertClockRisk = prefs?.alertClockRisk ?? true;
    const alertForecast = prefs?.alertForecast ?? false;
    const forecastThreshold = prefs?.forecastThreshold ?? 10000;

    let orgQueued = 0;
    let orgPromoted = 0;
    let orgClockAlerts = 0;
    let orgForecastAlert = 0;

    // 1. overdue watch invoices → statutory ladder
    if (alertOverdue) {
      const dueWatch = await prisma.invoice.findMany({
        where: { orgId: org.id, status: "watch" },
        include: { buyer: true },
      });
      for (const inv of dueWatch) {
        scanned++;
        const od = daysOverdue({ dueOn: inv.dueOn }, now);
        if (od <= 0) continue;
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

        // queue email (if enabled)
        if (emailOn) {
          await prisma.reminder.create({
            data: { invoiceId: inv.id, channel: "email", kind: "statutory", subject: notice.subject, body: notice.body, status: "queued" },
          });
          orgQueued++;
        }
        // queue WhatsApp escalation (if enabled)
        if (whatsappOn) {
          await prisma.reminder.create({
            data: { invoiceId: inv.id, channel: "whatsapp", kind: "escalation", subject: WHATSAPP_ESCALATION.subject, body: WHATSAPP_ESCALATION.body, status: "queued" },
          });
          orgQueued++;
        }
        // promote invoice to reminder_sent
        await prisma.invoice.update({ where: { id: inv.id }, data: { status: "reminder_sent" } });
        await prisma.event.create({
          data: { orgId: org.id, invoiceId: inv.id, type: "notice", title: `Reminder tick: statutory demand queued for ${inv.buyer.name}`, detail: `Auto-detected day-${od} default · ${emailOn ? "email" : ""}${emailOn && whatsappOn ? " + " : ""}${whatsappOn ? "WhatsApp" : ""} queued · ₹${Math.round(notice.totalDue).toLocaleString("en-IN")} claimable` },
        });
        orgPromoted++;
      }
    }

    // 2. MSEFC clock risk — cases ≤14 days from the decision deadline
    if (alertClockRisk) {
      const activeCases = await prisma.case.findMany({
        where: { orgId: org.id, stage: { not: "award" } },
        include: { invoice: { include: { buyer: true } } },
      });
      for (const c of activeCases) {
        const decisionBy = new Date(c.filedOn.getTime() + MSEFC_DECISION_DAYS * DAY);
        const daysLeft = Math.ceil((decisionBy.getTime() - now.getTime()) / DAY);
        if (daysLeft > 14 || daysLeft < 0) continue;
        // have we already queued a hearing reminder for this case?
        const existingHearing = await prisma.reminder.findFirst({
          where: { invoiceId: c.invoiceId, kind: "hearing" },
        });
        if (existingHearing) continue;

        const channel = smsOn ? "sms" : emailOn ? "email" : whatsappOn ? "whatsapp" : null;
        if (!channel) continue;
        await prisma.reminder.create({
          data: { invoiceId: c.invoiceId, channel, kind: "hearing", subject: SMS_HEARING.subject, body: `${SMS_HEARING.body} Case ${c.caseNumber} — ${daysLeft} days left to the §18 decision deadline.`, status: "queued" },
        });
        await prisma.event.create({
          data: { orgId: org.id, invoiceId: c.invoiceId, type: "system", title: `MSEFC clock alert — ${c.caseNumber}`, detail: `${daysLeft} days to decision deadline (§18). ${channel} reminder queued to ${c.invoice.buyer.name}.` },
        });
        orgClockAlerts++;
      }
    }

    // 3. forecast threshold — queue an alert if the daily §16 bleed exceeds the org's threshold
    if (alertForecast && (emailOn || whatsappOn || smsOn)) {
      const liveInvoices = await prisma.invoice.findMany({
        where: { orgId: org.id, status: { not: "recovered" } },
      });
      const perDay = liveInvoices.reduce((s, inv) => {
        const od = Math.max(0, Math.floor((now.getTime() - inv.dueOn.getTime()) / DAY));
        if (od <= 0) return s;
        return s + (inv.amount * Math.pow(1 + MONTHLY, od / 30) - inv.amount) / 30 * (MONTHLY / (1 + MONTHLY));
      }, 0) * 30; // approx per-day
      if (perDay >= forecastThreshold) {
        // only alert once per day — check if we already queued a forecast reminder today
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const existingForecast = await prisma.event.findFirst({
          where: { orgId: org.id, type: "system", title: { contains: "Forecast threshold" }, createdAt: { gte: todayStart } },
        });
        if (!existingForecast) {
          const channel = emailOn ? "email" : whatsappOn ? "whatsapp" : "sms";
          // attach to the first live invoice (best-effort)
          const firstInv = liveInvoices[0];
          if (firstInv) {
            await prisma.reminder.create({
              data: {
                invoiceId: firstInv.id,
                channel,
                kind: "statutory",
                subject: `Recovery OS — daily §16 bleed exceeded ₹${forecastThreshold.toLocaleString("en-IN")}`,
                body: `Your portfolio is bleeding ₹${Math.round(perDay).toLocaleString("en-IN")}/day in §16 compound interest — above your alert threshold of ₹${forecastThreshold.toLocaleString("en-IN")}/day. Log in to Recovery OS to see the cost-of-inaction forecast and act.`,
                status: "queued",
              },
            });
            await prisma.event.create({
              data: { orgId: org.id, invoiceId: firstInv.id, type: "system", title: `Forecast threshold alert — ₹${Math.round(perDay).toLocaleString("en-IN")}/day bleed`, detail: `Exceeded the ₹${forecastThreshold.toLocaleString("en-IN")}/day threshold. ${channel} alert queued.` },
            });
            orgForecastAlert++;
          }
        }
      }
    }

    if (orgQueued > 0 || orgClockAlerts > 0 || orgForecastAlert) {
      perOrg.push({ org: org.name, queued: orgQueued, promoted: orgPromoted, clockAlerts: orgClockAlerts, forecastAlerts: orgForecastAlert });
    }
    queued += orgQueued;
    promoted += orgPromoted;
    clockAlerts += orgClockAlerts;
    forecastAlerts += orgForecastAlert;
  }

  if (orgs[0]) await audit(orgs[0].id, "system", AUDIT.CRON_TICK, { scanned, queued, promoted, clockAlerts, forecastAlerts, orgs: orgs.length });

  return { scanned, queued, promoted, clockAlerts, forecastAlerts, demoOrgsDeleted, perOrg, ranAt: now.toISOString() };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
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
