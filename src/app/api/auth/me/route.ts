import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/recovery";

/** GET /api/auth/me — the signed-in user and their primary org. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null, org: null });
  const org = await prisma.org.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, gstin: true, source: true, isDemo: true, createdAt: true },
  });
  return NextResponse.json({
    user,
    org,
  });
}
