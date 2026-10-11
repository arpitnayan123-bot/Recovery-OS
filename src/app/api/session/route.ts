import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionOrg, clearSessionOrg, ORG_COOKIE } from "@/lib/session";
import { prisma, seedOrgData } from "@/lib/recovery";

export async function GET() {
  const org = await getSessionOrg();
  return NextResponse.json({ org });
}

/** action: "demo" → instant demo org; "reset" → wipe session org data */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action === "demo") {
    const org = await prisma.$transaction(async (tx) => {
      const o = await tx.org.create({
        data: {
          name: "Shreeji Precision Components",
          contact: "Demo Operator",
          gstin: "24ABJCS4821H1ZR",
          city: "Rajkot, Gujarat",
          source: "tally",
          isDemo: true,
        },
      });
      await seedOrgData(tx, o.id);
      return o;
    });
    const store = await cookies();
    store.set(ORG_COOKIE, org.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return NextResponse.json({ org });
  }

  if (action === "reset") {
    const org = await getSessionOrg();
    if (org) {
      await prisma.org.delete({ where: { id: org.id } }); // cascades to all child rows
    }
    await clearSessionOrg();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE() {
  await clearSessionOrg();
  return NextResponse.json({ ok: true });
}
