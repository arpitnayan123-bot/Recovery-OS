/**
 * Recovery OS — pure domain logic. Client-safe (no server imports).
 * Stage machine, §16 interest plumbing, statutory notice drafting,
 * case numbering, buyer risk scoring.
 */
import { DEFAULT_BANK_RATE, statutoryInterest } from "./format";

export const SUCCESS_FEE = 0.125; // 12.5% of amounts actually recovered
export const STATUTORY_TERM_DAYS = 45;
export const MSEFC_DECISION_DAYS = 90;

/* ------------------------------- stage model ------------------------------ */

export const STAGES = [
  { key: "watch", label: "Monitored", short: "MONITOR" },
  { key: "reminder_sent", label: "Notice served", short: "NOTICE" },
  { key: "evidence_ready", label: "Evidence sealed", short: "EVIDENCE" },
  { key: "odr_filed", label: "Filed on ODR", short: "FILED" },
  { key: "award", label: "Award / recovery", short: "RECOVERY" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

/** hearing is a sub-state of filed; award/recovered belong to the last stage */
export function stageIndexOf(status: string): number {
  switch (status) {
    case "watch":
      return 0;
    case "reminder_sent":
      return 1;
    case "evidence_ready":
      return 2;
    case "odr_filed":
    case "hearing":
      return 3;
    case "award":
    case "recovered":
      return 4;
    default:
      return 0;
  }
}

export const STATUS_META: Record<string, { label: string; tone: "watch" | "flare" | "mint" | "alert" | "done" }> = {
  watch: { label: "Watching", tone: "watch" },
  reminder_sent: { label: "Notice served", tone: "flare" },
  evidence_ready: { label: "Evidence sealed", tone: "flare" },
  odr_filed: { label: "Filed on ODR", tone: "mint" },
  hearing: { label: "Hearing stage", tone: "mint" },
  award: { label: "Award won", tone: "mint" },
  recovered: { label: "Recovered", tone: "done" },
};

export const CASE_STAGE_META: Record<string, { label: string; idx: number }> = {
  filed: { label: "Filed", idx: 0 },
  admitted: { label: "Admitted", idx: 1 },
  hearing: { label: "Hearing", idx: 2 },
  award: { label: "Award", idx: 3 },
};

export const CASE_STAGES = ["filed", "admitted", "hearing", "award"] as const;

/* ------------------------------- money math ------------------------------- */

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export function daysOverdue(invoice: { dueOn: Date }, now = new Date()): number {
  return Math.max(0, daysBetween(invoice.dueOn, now));
}

export function invoiceInterest(amount: number, dueOn: Date, now = new Date(), bankRate = DEFAULT_BANK_RATE) {
  return statutoryInterest(amount, daysOverdue({ dueOn }, now), bankRate);
}

/** per-second §16 accrual used for the live ticking meter */
export function interestPerSecond(amount: number, dueOn: Date, now = new Date()) {
  const annual = (DEFAULT_BANK_RATE * 3) / 100;
  const months = daysOverdue({ dueOn }, now) / 30;
  const totalDue = amount * Math.pow(1 + annual / 12, months);
  const perSecond = (totalDue * Math.log(1 + annual / 12)) / (30 * 86_400);
  return Math.max(0, perSecond);
}

/* ----------------------------- statutory notice ---------------------------- */

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

export function buildStatutoryNotice(args: {
  supplierName: string;
  buyerName: string;
  invoiceNumber: string;
  amount: number;
  issuedOn: Date;
  dueOn: Date;
  now?: Date;
}) {
  const now = args.now ?? new Date();
  const od = daysOverdue({ dueOn: args.dueOn }, now);
  const { interest, totalDue, annualPct } = statutoryInterest(args.amount, od);

  const subject = `Statutory demand under Sections 15 & 16 of the Micro, Small and Medium Enterprises Development Act, 2006 — Invoice ${args.invoiceNumber}`;

  const body = [
    `To,`,
    `  ${args.buyerName}`,
    `  ${fmtDate(now)}`,
    ``,
    `Dear Sir/Madam,`,
    ``,
    `This notice is issued on behalf of ${args.supplierName} ("the supplier"), a micro/small enterprise registered under the Micro, Small and Medium Enterprises Development Act, 2006 ("MSMED Act").`,
    ``,
    `1. THE LIABILITY. The buyer procured goods/services against Tax Invoice ${args.invoiceNumber} dated ${fmtDate(args.issuedOn)} for a contract consideration of Rs. ${Math.round(args.amount).toLocaleString("en-IN")}/-. Under Section 15 of the MSMED Act, the amount was payable on or before ${fmtDate(args.dueOn)} (within forty-five days of acceptance).`,
    ``,
    `2. THE DEFAULT. The amount remains unpaid ${od} day(s) beyond the statutory term. Consequently, under Section 16 of the MSMED Act, the buyer is liable to pay compound interest with monthly rests at three times the bank rate notified by the Reserve Bank of India — currently ${annualPct.toFixed(2)}% per annum.`,
    ``,
    `3. AMOUNT CLAIMABLE AS OF TODAY:`,
    `      Principal ...... Rs. ${Math.round(args.amount).toLocaleString("en-IN")}`,
    `      §16 interest .... Rs. ${Math.round(interest).toLocaleString("en-IN")} (${od} days, compounded monthly)`,
    `      Total payable .. Rs. ${Math.round(totalDue).toLocaleString("en-IN")}`,
    ``,
    `4. CONSEQUENCES OF DEFAULT. In the event of continued default, the supplier shall move the Micro and Small Enterprises Facilitation Council (MSEFC) under Section 18 of the MSMED Act. Any reference is required to be decided within ninety days. Under Section 19, a buyer intending to appeal an award must first deposit seventy-five percent (75%) of the decree amount with the Council.`,
    ``,
    `5. DEMAND. The buyer is called upon to remit Rs. ${Math.round(totalDue).toLocaleString("en-IN")}/- within fourteen (14) days of receipt of this notice, failing which recovery proceedings will be initiated at the buyer's cost, risk and consequence.`,
    ``,
    `Issued by Recovery OS on behalf of the supplier, with full documentary evidence (purchase order, delivery challans, GST filings and buyer ledger) held in escrow.`,
    ``,
    `For ${args.supplierName}`,
  ].join("\n");

  return { subject, body, interest, totalDue, daysOverdue: od, annualPct };
}

/* --------------------------------- helpers -------------------------------- */

export function odrCaseNumber(now = new Date()): string {
  const year = now.getFullYear();
  const serial = 10_000 + Math.floor(Math.random() * 89_999);
  return `ODR/${year}/${serial}`;
}

const RISK_LABELS: Array<{ min: number; label: string; tone: "mint" | "flare" | "alert" }> = [
  { min: 75, label: "RELIABLE PAYER", tone: "mint" },
  { min: 45, label: "SLOW PAYER", tone: "flare" },
  { min: 0, label: "CHRONIC DEFAULTER", tone: "alert" },
];

/** 0–100: 100 = pays within term. Degrades with average lateness and defaults. */
export function buyerRiskScore(avgDaysLate: number, lateRatio: number): number {
  const latenessPenalty = Math.min(70, avgDaysLate * 0.55);
  const defaultPenalty = lateRatio * 45;
  return Math.max(2, Math.round(100 - latenessPenalty - defaultPenalty));
}

export function riskLabel(score: number) {
  return RISK_LABELS.find((r) => score >= r.min) ?? RISK_LABELS[RISK_LABELS.length - 1];
}
