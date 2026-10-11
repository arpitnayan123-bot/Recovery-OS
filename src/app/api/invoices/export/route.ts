import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { prisma, invoiceInterest, daysOverdue } from "@/lib/recovery";

/**
 * GET /api/invoices/export?filter=all|overdue|recovery|watch|recovered
 * Exports the org's invoices as a CSV download — reconciliation-ready.
 */
export async function GET(req: Request) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all";

  const invoices = await prisma.invoice.findMany({
    where: { orgId: org.id },
    include: { buyer: true, case: true },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  let rows = invoices.map((inv) => {
    const od = daysOverdue({ dueOn: inv.dueOn }, now);
    const { interest, totalDue } = invoiceInterest(inv.amount, inv.dueOn, now);
    return {
      number: inv.number,
      buyer: inv.buyer.name,
      buyer_gstin: inv.buyer.gstin ?? "",
      buyer_city: inv.buyer.city ?? "",
      amount: inv.amount,
      issuedOn: inv.issuedOn.toISOString().slice(0, 10),
      dueOn: inv.dueOn.toISOString().slice(0, 10),
      daysOverdue: od,
      status: inv.status,
      interest_accrued: inv.status === "recovered" ? 0 : Math.round(interest),
      total_claimable: inv.status === "recovered" ? inv.recoveredAmount ?? inv.amount : Math.round(totalDue),
      case_number: inv.case?.caseNumber ?? "",
      case_stage: inv.case?.stage ?? "",
      recovered_at: inv.recoveredAt ? inv.recoveredAt.toISOString().slice(0, 10) : "",
      recovered_amount: inv.recoveredAmount ?? "",
      success_fee: inv.successFee ?? "",
    };
  });

  if (filter === "overdue") rows = rows.filter((r) => r.daysOverdue > 0 && r.status !== "recovered");
  if (filter === "recovery") rows = rows.filter((r) => !["watch", "recovered"].includes(r.status));
  if (filter === "watch") rows = rows.filter((r) => r.status === "watch");
  if (filter === "recovered") rows = rows.filter((r) => r.status === "recovered");

  const headers = [
    "number", "buyer", "buyer_gstin", "buyer_city", "amount", "issuedOn", "dueOn",
    "daysOverdue", "status", "interest_accrued", "total_claimable",
    "case_number", "case_stage", "recovered_at", "recovered_amount", "success_fee",
  ];

  const esc = (v: unknown) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc((r as any)[h])).join(",")),
  ].join("\n");

  const stamp = now.toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recovery-os-invoices-${stamp}-${filter}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
