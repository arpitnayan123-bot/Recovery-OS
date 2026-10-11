import { NextResponse } from "next/server";
import { prisma } from "@/lib/recovery";
import { hashPassword, setSessionUser, getSessionUser, audit, AUDIT } from "@/lib/auth";

/** POST /api/auth/signup — create a user account (email + password). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim() || null;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });

  await setSessionUser(user.id);
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}

/** GET /api/auth/me — the currently signed-in user. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user });
}
