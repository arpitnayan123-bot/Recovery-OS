import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { prisma } from "@/lib/recovery";

/**
 * GET /api/audit — the org's immutable audit log + recent import batches.
 */
export async function GET() {
  const sessionOrg = await getSessionOrg();
  if (!sessionOrg) return NextResponse.json({ error: "No session" }, { status: 401 });

  const [logs, imports, org] = await Promise.all([
    prisma.auditLog.findMany({
      where: { orgId: sessionOrg.id },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.importBatch.findMany({
      where: { orgId: sessionOrg.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.org.findUnique({ where: { id: sessionOrg.id } }),
  ]);

  return NextResponse.json({
    org: org
      ? { id: org.id, name: org.name, gstin: org.gstin, source: org.source, isDemo: org.isDemo, userId: org.userId, createdAt: org.createdAt }
      : null,
    logs: logs.map((l) => ({ ...l, meta: JSON.parse(l.meta || "{}") })),
    imports: imports.map((b) => ({ ...b, errors: JSON.parse(b.errors || "[]") })),
  });
}
