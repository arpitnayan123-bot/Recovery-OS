import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { prisma, invoiceInterest, MSEFC_DECISION_DAYS } from "@/lib/recovery";

export async function GET() {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const cases = await prisma.case.findMany({
    where: { orgId: org.id },
    include: { invoice: { include: { buyer: true, documents: true } } },
    orderBy: { filedOn: "desc" },
  });

  const now = new Date();
  const rows = cases.map((c) => {
    const { totalDue } = invoiceInterest(c.invoice.amount, c.invoice.dueOn, now);
    const decisionBy = new Date(c.filedOn.getTime() + MSEFC_DECISION_DAYS * 86_400_000);
    return {
      id: c.id,
      caseNumber: c.caseNumber,
      stage: c.stage,
      filedOn: c.filedOn,
      hearingOn: c.hearingOn,
      awardAmount: c.awardAmount,
      decisionBy,
      daysLeft: Math.max(0, Math.ceil((decisionBy.getTime() - now.getTime()) / 86_400_000)),
      invoice: {
        id: c.invoice.id,
        number: c.invoice.number,
        amount: c.invoice.amount,
        status: c.invoice.status,
        daysOverdue: Math.max(0, Math.floor((now.getTime() - c.invoice.dueOn.getTime()) / 86_400_000)),
        buyer: { name: c.invoice.buyer.name, gstin: c.invoice.buyer.gstin },
      },
      claim: c.awardAmount ?? totalDue,
      docsCount: c.invoice.documents.length,
    };
  });

  return NextResponse.json({ cases: rows });
}
