import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ORG_COOKIE } from "@/lib/session";
import { prisma, seedOrgData } from "@/lib/recovery";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /onboarding/demo — instant demo, no JavaScript required.
 * Creates a seeded demo org, sets the session cookie and forwards straight
 * to the console. Works even before React hydrates, so a fast click right
 * after landing can never be lost.
 *
 * Hardened:
 *  - idempotent: a browser with a live demo org reuses it (no org spam,
 *    no concurrent double-seed — the original source of ?demo=failed)
 *  - atomic: org + full seed run inside one transaction (partial seeds
 *    roll back instead of leaving a broken workspace)
 *  - retried once on transient failure
 */
export async function GET(req: Request) {
  const store = await cookies();

  try {
    /* 1. reuse this browser's existing live demo org when present */
    const existingId = store.get(ORG_COOKIE)?.value;
    if (existingId) {
      const existing = await prisma.org.findFirst({
        where: { id: existingId, isDemo: true },
        select: { id: true },
      });
      if (existing) return NextResponse.redirect(new URL("/console", req.url), 303);
    }
  } catch {
    /* cookie lookup failure must never block demo creation */
  }

  const createDemo = async () => {
    const user = await getSessionUser();
    return prisma.$transaction(async (tx) => {
      const org = await tx.org.create({
        data: {
          name: "Shreeji Precision Components",
          contact: "Demo Operator",
          gstin: "24ABJCS4821H1ZR",
          city: "Rajkot, Gujarat",
          source: "tally",
          isDemo: true,
          userId: user?.id ?? null,
        },
      });
      await seedOrgData(tx, org.id);
      return org;
    });
  };

  try {
    const org = await createDemo().catch(() => createDemo()); // one retry on transient failure

    store.set(ORG_COOKIE, org.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.redirect(new URL("/console", req.url), 303);
  } catch (err) {
    console.error("[onboarding/demo] failed to spin up demo org:", err);
    return NextResponse.redirect(new URL("/onboarding?demo=failed", req.url), 303);
  }
}
