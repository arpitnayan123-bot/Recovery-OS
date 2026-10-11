import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { prisma } from "@/lib/recovery";

export async function GET(req: Request) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const take = Math.min(200, Number(searchParams.get("take") ?? 60));

  const events = await prisma.event.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    take,
    include: { invoice: { select: { number: true, id: true } } },
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      detail: e.detail,
      createdAt: e.createdAt,
      invoice: e.invoice,
    })),
  });
}
