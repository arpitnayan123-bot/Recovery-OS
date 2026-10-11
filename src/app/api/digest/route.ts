import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { getSessionUser, audit, AUDIT } from "@/lib/auth";
import { prisma } from "@/lib/recovery";

const VALID_CHANNELS = ["emailEnabled", "whatsappEnabled", "smsEnabled"];
const VALID_ALERTS = ["alertOverdue", "alertClockRisk", "alertForecast", "alertRecovery", "alertInsight"];
const VALID_CADENCES = ["instant", "daily", "weekly"];

/**
 * GET /api/digest — the org's email/whatsapp/sms digest preferences.
 * POST /api/digest — upsert preferences.
 */
export async function GET() {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const prefs = await prisma.digestPreference.findUnique({ where: { orgId: org.id } });
  if (!prefs) {
    // return defaults
    return NextResponse.json({
      prefs: {
        emailEnabled: true,
        whatsappEnabled: false,
        smsEnabled: false,
        alertOverdue: true,
        alertClockRisk: true,
        alertForecast: false,
        alertRecovery: true,
        alertInsight: false,
        forecastThreshold: 10000,
        cadence: "instant",
      },
    });
  }
  return NextResponse.json({ prefs });
}

export async function POST(req: Request) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });
  const user = await getSessionUser();

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  for (const k of VALID_CHANNELS) {
    if (typeof body[k] === "boolean") data[k] = body[k];
  }
  for (const k of VALID_ALERTS) {
    if (typeof body[k] === "boolean") data[k] = body[k];
  }
  if (typeof body.forecastThreshold === "number" && body.forecastThreshold >= 0) {
    data.forecastThreshold = Math.min(1_000_000, Math.round(body.forecastThreshold));
  }
  if (typeof body.cadence === "string" && VALID_CADENCES.includes(body.cadence)) {
    data.cadence = body.cadence;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid preference fields provided" }, { status: 400 });
  }

  const prefs = await prisma.digestPreference.upsert({
    where: { orgId: org.id },
    create: { orgId: org.id, ...data },
    update: data,
  });

  await audit(org.id, user?.email ?? "anonymous", "digest.update", { fields: Object.keys(data) });

  return NextResponse.json({ prefs });
}
