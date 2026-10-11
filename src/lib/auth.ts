import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./recovery";

/**
 * Recovery OS — authentication + session layer.
 * DB-backed revocable sessions: the ros_user cookie holds a userId that is
 * validated against the User table on every request, so deleting the user or
 * clearing the cookie revokes access instantly. No long-lived opaque tokens.
 */

export const USER_COOKIE = "ros_user";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export const SESSION_COOKIE = "ros_org"; // re-exported name used elsewhere

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** The currently signed-in user, or null. */
export async function getSessionUser() {
  const store = await cookies();
  const userId = store.get(USER_COOKIE)?.value;
  if (!userId) return null;
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true, createdAt: true },
    });
  } catch {
    return null;
  }
}

/** Set the ros_user session cookie (called on successful login/signup). */
export async function setSessionUser(userId: string) {
  const store = await cookies();
  store.set(USER_COOKIE, userId, COOKIE_OPTS);
}

export async function clearSessionUser() {
  const store = await cookies();
  store.delete(USER_COOKIE);
}

/* ----------------------------- audit logging ------------------------------ */

/** Append an immutable row to the org's audit log. Best-effort (never throws into the request path). */
export async function audit(orgId: string | null, actor: string, action: string, meta: Record<string, unknown> = {}) {
  if (!orgId) return;
  try {
    await prisma.auditLog.create({
      data: { orgId, actor, action, meta: JSON.stringify(meta) },
    });
  } catch (e) {
    // audit must never break a request
    console.error("[audit] failed", action, e);
  }
}

export const AUDIT = {
  SIGNUP: "auth.signup",
  LOGIN: "auth.login",
  LOGOUT: "auth.logout",
  IMPORT: "import.run",
  ADVANCE: "invoice.advance",
  DILIGENCE: "diligence.run",
  INSIGHT: "insight.run",
  NOTICE_PDF: "document.notice_pdf",
  CRON_TICK: "cron.tick",
  SESSION_END: "session.end",
  FORECAST: "forecast.view",
  PASSWORD_CHANGE: "auth.password_change",
} as const;
