/** Client-safe wire types (JSON-serialized shapes from the API). */

export type InvoiceDTO = {
  id: string;
  number: string;
  amount: number;
  issuedOn: string;
  dueOn: string;
  status: string;
  stageIndex: number;
  recoveredAt: string | null;
  recoveredAmount: number | null;
  successFee: number | null;
  buyer: { name: string; gstin: string | null };
  daysOverdue: number;
  inGrace: boolean;
  interest: number;
  totalDue: number;
  interestPerSecond: number;
  claimable: number;
  case: {
    id: string;
    caseNumber: string;
    stage: string;
    filedOn: string;
    hearingOn: string | null;
    awardAmount: number | null;
  } | null;
  docs: { id: string; kind: string; name: string; status: string }[];
  reminders: { id: string; kind: string; subject: string; body: string; sentOn: string; channel: string }[];
  events: { id: string; type: string; title: string; detail: string | null; createdAt: string }[];
};

export type SessionDTO = {
  org: {
    id: string;
    name: string;
    gstin: string | null;
    city: string | null;
    contact: string | null;
    source: string;
    isDemo: boolean;
    createdAt: string;
  } | null;
};
