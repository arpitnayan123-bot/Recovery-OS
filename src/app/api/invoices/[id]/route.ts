import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { loadInvoice } from "@/lib/dto";
import { serializeInvoice } from "@/lib/dto";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { id } = await ctx.params;
  const inv = await loadInvoice(org.id, id);
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  return NextResponse.json({ invoice: serializeInvoice(inv) });
}
