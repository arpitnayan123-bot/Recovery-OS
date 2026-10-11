import { NextResponse } from "next/server";
import { prisma } from "@/lib/recovery";
import { verifyPassword, setSessionUser, audit, AUDIT, getSessionUser } from "@/lib/auth";

/** POST /api/auth/login — email + password. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await setSessionUser(user.id);
  const org = await prisma.org.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  await audit(org?.id ?? null, user.email, AUDIT.LOGIN);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user });
}
