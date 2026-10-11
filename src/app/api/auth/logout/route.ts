import { NextResponse } from "next/server";
import { getSessionUser, clearSessionUser, audit, AUDIT } from "@/lib/auth";
import { prisma } from "@/lib/recovery";

/** POST /api/auth/logout — revoke the ros_user session cookie. */
export async function POST() {
  const user = await getSessionUser();
  if (user) {
    const org = await prisma.org.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    await audit(org?.id ?? null, user.email, AUDIT.LOGOUT);
  }
  await clearSessionUser();
  return NextResponse.json({ ok: true });
}
