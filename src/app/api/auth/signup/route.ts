import { NextResponse } from "next/server";
import { prisma } from "@/lib/recovery";
import { hashPassword, setSessionUser, getSessionUser } from "@/lib/auth";
import { rateLimit, RATE_LIMITS, csrfCheck, secureCookieOpts } from "@/lib/security";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

/** POST /api/auth/signup — create a user account (email + password), with rate limiting + CSRF + Zod. */
export async function POST(req: Request) {
  // CSRF check
  const csrfErr = csrfCheck(req);
  if (csrfErr) return csrfErr;

  // Rate limit: 3 signups / hour per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rlErr = rateLimit(`signup:${ip}`, RATE_LIMITS.SIGNUP.max, RATE_LIMITS.SIGNUP.windowMs);
  if (rlErr) return rlErr;

  // Zod validation
  const parsed = signupSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { email, password, name } = parsed.data;
  const emailLower = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email: emailLower, name: name || null, passwordHash },
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
