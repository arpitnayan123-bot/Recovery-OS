import { prisma, daysOverdue, invoiceInterest, interestPerSecond, stageIndexOf } from "./recovery";

export type InvoiceCaseDTO = {
  id: string;
  caseNumber: string;
  stage: string;
  filedOn: Date;
  hearingOn: Date | null;
  awardAmount: number | null;
};

export type SerializeInput = {
  id: string;
  number: string;
  amount: number;
  issuedOn: Date;
  dueOn: Date;
  status: string;
  recoveredAt: Date | null;
  recoveredAmount: number | null;
  successFee: number | null;
  buyer: { name: string; gstin: string | null };
  case: InvoiceCaseDTO | null;
  documents: { id: string; kind: string; name: string; status: string }[];
  reminders: { id: string; kind: string; subject: string; body: string; sentOn: Date; channel: string }[];
  events: { id: string; type: string; title: string; detail: string | null; createdAt: Date }[];
};

/** Serialize an invoice (with relations) into the wire DTO the console consumes. */
export function serializeInvoice(inv: SerializeInput, now = new Date()) {
  const od = daysOverdue({ dueOn: inv.dueOn }, now);
  const { interest, totalDue } = invoiceInterest(inv.amount, inv.dueOn, now);
  const perSecond = interestPerSecond(inv.amount, inv.dueOn, now);
  const recovered = inv.status === "recovered";

  return {
    id: inv.id,
    number: inv.number,
    amount: inv.amount,
    issuedOn: inv.issuedOn,
    dueOn: inv.dueOn,
    status: inv.status,
    stageIndex: stageIndexOf(inv.status),
    recoveredAt: inv.recoveredAt,
    recoveredAmount: inv.recoveredAmount,
    successFee: inv.successFee,
    buyer: { name: inv.buyer.name, gstin: inv.buyer.gstin },
    daysOverdue: od,
    inGrace: od === 0 && inv.status !== "recovered",
    interest: recovered ? 0 : interest,
    totalDue: recovered ? (inv.recoveredAmount ?? inv.amount) : totalDue,
    interestPerSecond: recovered ? 0 : perSecond,
    claimable: recovered ? (inv.recoveredAmount ?? inv.amount) : totalDue,
    case: inv.case,
    docs: inv.documents,
    reminders: inv.reminders,
    events: inv.events,
  };
}

export type InvoiceDTO = ReturnType<typeof serializeInvoice>;

/** Prisma include that gives serializeInvoice everything it needs. */
export const invoiceInclude = {
  buyer: true,
  case: true,
  documents: { orderBy: { createdAt: "asc" as const } },
  reminders: { orderBy: { sentOn: "desc" as const } },
  events: { orderBy: { createdAt: "desc" as const }, take: 12 },
};

export async function loadInvoice(orgId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, orgId },
    include: invoiceInclude,
  });
}
