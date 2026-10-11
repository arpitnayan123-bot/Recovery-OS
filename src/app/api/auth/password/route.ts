import { NextResponse } from "next/server";
import { getSessionUser, verifyPassword, hashPassword, audit, AUDIT } from "@/lib/auth";
import { prisma } from "@/lib/recovery";

/**
 * POST /api/auth/password
 * Change the signed-in user's password. Requires the current password to match.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const current = String(body?.current ?? "");
  const next = String(body?.next ?? "");

  if (!current || !next) {
    return NextResponse.json({ error: "Current and new passwords are required" }, { status: 400 });
  }
  if (next.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }
  if (current === next) {
    return NextResponse.json({ error: "New password must be different from the current one" }, { status: 400 });
  }

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full || !(await verifyPassword(current, full.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const passwordHash = await hashPassword(next);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  const org = await prisma.org.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  await audit(org?.id ?? null, user.email, AUDIT.PASSWORD_CHANGE);

  return NextResponse.json({ ok: true });
}
