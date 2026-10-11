import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ORG_COOKIE } from "@/lib/session";
import { prisma, seedOrgData } from "@/lib/recovery";
import { getSessionUser, audit, AUDIT } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const name = String(body?.company ?? "").trim();
  if (!name) return NextResponse.json({ error: "Company name is required" }, { status: 400 });

  // link the new org to the signed-in user, when present
  const user = await getSessionUser();

  const org = await prisma.org.create({
    data: {
      name,
      contact: body?.contact ? String(body.contact).slice(0, 120) : null,
      gstin: body?.gstin ? String(body.gstin).toUpperCase().replace(/\s/g, "") : null,
      city: body?.city ? String(body.city).slice(0, 120) : null,
      source: ["tally", "zoho", "csv", "manual"].includes(body?.source) ? body.source : "manual",
      isDemo: Boolean(body?.seed),
      userId: user?.id ?? null,
    },
  });

  if (body?.seed !== false) {
    await seedOrgData(prisma, org.id);
  }

  const store = await cookies();
  store.set(ORG_COOKIE, org.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });

  await audit(org.id, user?.email ?? "anonymous", AUDIT.SIGNUP, { org: org.name, seeded: body?.seed !== false });

  return NextResponse.json({ org });
}
