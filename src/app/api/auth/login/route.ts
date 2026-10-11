import { NextResponse } from "next/server";
import { prisma } from "@/lib/recovery";
import { verifyPassword, setSessionUser, audit, AUDIT, getSessionUser } from "@/lib/auth";
import { rateLimit, RATE_LIMITS, csrfCheck } from "@/lib/security";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** POST /api/auth/login — email + password, with rate limiting + CSRF + Zod. */
export async function POST(req: Request) {
  // CSRF check
  const csrfErr = csrfCheck(req);
  if (csrfErr) return csrfErr;

  // Rate limit: 5 attempts / 15 min per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rlErr = rateLimit(`login:${ip}`, RATE_LIMITS.LOGIN.max, RATE_LIMITS.LOGIN.windowMs);
  if (rlErr) return rlErr;

  // Zod validation
  const parsed = loginSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email and password are required" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
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
