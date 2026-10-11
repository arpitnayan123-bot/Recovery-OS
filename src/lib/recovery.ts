/**
 * Recovery OS — server-side recovery engine.
 * Prisma access + demo seeding. Pure domain logic lives in ./domain
 * (re-exported here so server routes have one import point).
 */
import { PrismaClient } from "@prisma/client";
import {
  SUCCESS_FEE,
  STATUTORY_TERM_DAYS,
  MSEFC_DECISION_DAYS,
  STAGES,
  stageIndexOf,
  buildStatutoryNotice,
  odrCaseNumber,
  daysOverdue,
  invoiceInterest,
} from "./domain";

export * from "./domain";

/* Prisma singleton — survives Next.js dev HMR reloads */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/* ------------------------------- demo seeding ------------------------------ */

type SeedSpec = {
  number: string;
  buyer: string;
  buyerGstin: string;
  amount: number;
  issuedDaysAgo: number;
  status: string;
  caseFiledDaysAgo?: number;
  caseStage?: string;
  recoveredDaysAgo?: number;
};

const SEED: SeedSpec[] = [
  { number: "SPC/2026/0417", buyer: "Meru Auto Components Pvt Ltd", buyerGstin: "27AABCM1234K1ZV", amount: 1_850_000, issuedDaysAgo: 271, status: "hearing", caseFiledDaysAgo: 62, caseStage: "hearing" },
  { number: "NSR/2026/1102", buyer: "Northstar Retail India Ltd", buyerGstin: "07AABCN5678L1ZQ", amount: 4_200_000, issuedDaysAgo: 190, status: "evidence_ready" },
  { number: "APEX/1134", buyer: "Apex Electricals & Fittings", buyerGstin: "29AACCA9012M1Z8", amount: 675_500, issuedDaysAgo: 128, status: "reminder_sent" },
  { number: "KAV/0871", buyer: "Kavya Textiles Mills Pvt Ltd", buyerGstin: "24AABCK3456N1Z2", amount: 1_120_000, issuedDaysAgo: 96, status: "reminder_sent" },
  { number: "ORBT/2231", buyer: "Orbit Appliances Ltd", buyerGstin: "06AABCO7890P1ZK", amount: 2_480_000, issuedDaysAgo: 58, status: "watch" },
  { number: "SPC/2026/0533", buyer: "Meru Auto Components Pvt Ltd", buyerGstin: "27AABCM1234K1ZV", amount: 940_000, issuedDaysAgo: 41, status: "watch" },
  { number: "APEX/1090", buyer: "Apex Electricals & Fittings", buyerGstin: "29AACCA9012M1Z8", amount: 320_000, issuedDaysAgo: 210, status: "award", caseFiledDaysAgo: 121, caseStage: "award" },
  { number: "NSR/2026/0977", buyer: "Northstar Retail India Ltd", buyerGstin: "07AABCN5678L1ZQ", amount: 1_575_000, issuedDaysAgo: 320, status: "recovered", recoveredDaysAgo: 92 },
];

const DOC_KINDS = [
  { kind: "tax_invoice", name: "Tax invoice (GST compliant)" },
  { kind: "po", name: "Purchase order / work order" },
  { kind: "challan", name: "Delivery challan + e-way bill" },
  { kind: "gst_filing", name: "GSTR-1 extract (filed)" },
  { kind: "ledger", name: "Buyer ledger statement" },
];

const DAY = 86_400_000;

/**
 * Create a demo-ready organisation: 5 buyers, 8 invoices spread across every
 * pipeline stage, matching cases / reminders / documents / event history.
 * Accepts a PrismaClient or an interactive-transaction client so callers can
 * make org creation + seeding atomic.
 */
export async function seedOrgData(
  prisma: PrismaClient | Prisma.TransactionClient,
  orgId: string,
) {
  const now = Date.now();
  const buyers = new Map<string, string>();

  for (const spec of SEED) {
    let buyerId = buyers.get(spec.buyer);
    if (!buyerId) {
      const b = await prisma.buyer.create({
        data: { orgId, name: spec.buyer, gstin: spec.buyerGstin },
      });
      buyerId = b.id;
      buyers.set(spec.buyer, buyerId);
    }

    const issuedOn = new Date(now - spec.issuedDaysAgo * DAY);
    const dueOn = new Date(issuedOn.getTime() + STATUTORY_TERM_DAYS * DAY);
    const overdue = daysOverdue({ dueOn }, new Date());
    const { interest, totalDue } = invoiceInterest(spec.amount, dueOn);

    const invoice = await prisma.invoice.create({
      data: {
        orgId,
        buyerId,
        number: spec.number,
        amount: spec.amount,
        issuedOn,
        dueOn,
        status: spec.status,
        recoveredAt: spec.recoveredDaysAgo ? new Date(now - spec.recoveredDaysAgo * DAY) : null,
        recoveredAmount: spec.status === "recovered" ? totalDue : null,
        successFee: spec.status === "recovered" ? totalDue * SUCCESS_FEE : null,
      },
    });

    const baseEvent = { orgId, invoiceId: invoice.id };

    if (spec.status === "recovered") {
      const recoveredOn = new Date(now - spec.recoveredDaysAgo! * DAY);
      const notice = buildStatutoryNotice({ supplierName: "the supplier", buyerName: spec.buyer, invoiceNumber: spec.number, amount: spec.amount, issuedOn, dueOn, now: recoveredOn });
      await prisma.reminder.create({ data: { invoiceId: invoice.id, kind: "statutory", subject: notice.subject, body: notice.body, sentOn: new Date(recoveredOn.getTime() - 150 * DAY) } });
      for (const d of DOC_KINDS) await prisma.document.create({ data: { invoiceId: invoice.id, ...d, status: "verified" } });
      await prisma.case.create({ data: { orgId, invoiceId: invoice.id, caseNumber: "ODR/2025/11342", stage: "award", filedOn: new Date(recoveredOn.getTime() - 160 * DAY), hearingOn: new Date(recoveredOn.getTime() - 100 * DAY), awardAmount: totalDue } });
      await prisma.event.createMany({ data: [
        { ...baseEvent, type: "sync", title: `Invoice ${spec.number} ingested — ₹${Math.round(spec.amount).toLocaleString("en-IN")}`, createdAt: issuedOn },
        { ...baseEvent, type: "detect", title: "Statutory term breached — §16 interest switched on", createdAt: dueOn },
        { ...baseEvent, type: "notice", title: `Statutory demand served on ${spec.buyer}`, createdAt: new Date(recoveredOn.getTime() - 150 * DAY) },
        { ...baseEvent, type: "evidence", title: "Evidence pack sealed — 5 documents verified", createdAt: new Date(recoveredOn.getTime() - 170 * DAY) },
        { ...baseEvent, type: "filed", title: "Reference filed on ODR portal — ODR/2025/11342", createdAt: new Date(recoveredOn.getTime() - 160 * DAY) },
        { ...baseEvent, type: "award", title: `MSEFC award — ₹${Math.round(totalDue).toLocaleString("en-IN")} decreed`, createdAt: new Date(recoveredOn.getTime() - 100 * DAY) },
        { ...baseEvent, type: "recovered", title: `₹${Math.round(totalDue).toLocaleString("en-IN")} recovered — supplier paid, fee settled`, createdAt: recoveredOn },
      ] });
      continue;
    }

    // every live invoice gets ingestion + (if past due) detection events
    await prisma.event.create({ data: { ...baseEvent, type: "sync", title: `Invoice ${spec.number} ingested — ₹${Math.round(spec.amount).toLocaleString("en-IN")}`, createdAt: issuedOn } });
    if (overdue > 0) {
      await prisma.event.create({ data: { ...baseEvent, type: "detect", title: `${spec.buyer} crossed day 45 — §16 interest now accruing`, createdAt: dueOn } });
    }

    if (["reminder_sent", "evidence_ready", "hearing", "award"].includes(spec.status)) {
      const noticeDate = new Date(dueOn.getTime() + 6 * DAY);
      const notice = buildStatutoryNotice({ supplierName: "the supplier", buyerName: spec.buyer, invoiceNumber: spec.number, amount: spec.amount, issuedOn, dueOn, now: noticeDate });
      await prisma.reminder.create({ data: { invoiceId: invoice.id, kind: "statutory", subject: notice.subject, body: notice.body, sentOn: noticeDate } });
      await prisma.event.create({ data: { ...baseEvent, type: "notice", title: `Statutory demand served on ${spec.buyer} — day ${overdue} overdue`, createdAt: noticeDate } });
    }

    if (["evidence_ready", "hearing", "award"].includes(spec.status)) {
      for (const d of DOC_KINDS) await prisma.document.create({ data: { invoiceId: invoice.id, ...d, status: "verified" } });
      await prisma.event.create({ data: { ...baseEvent, type: "evidence", title: "Evidence pack sealed — PO, challans, GST filings matched", createdAt: new Date(dueOn.getTime() + 14 * DAY) } });
    }

    if (spec.caseFiledDaysAgo) {
      const filedOn = new Date(now - spec.caseFiledDaysAgo * DAY);
      const stage = spec.caseStage ?? "filed";
      const hearingOn =
        stage === "hearing" ? new Date(now + 21 * DAY) : stage === "award" ? new Date(filedOn.getTime() + 61 * DAY) : null;
      await prisma.case.create({ data: { orgId, invoiceId: invoice.id, caseNumber: `ODR/${filedOn.getFullYear()}/${10_400 + Math.floor(Math.random() * 8_000)}`, stage, filedOn, hearingOn, awardAmount: stage === "award" ? totalDue : null } });
      await prisma.event.create({ data: { ...baseEvent, type: "filed", title: "Reference filed on ODR portal — statutory 90-day clock started", createdAt: filedOn } });
      if (stage === "hearing") {
        await prisma.event.create({ data: { ...baseEvent, type: "hearing", title: "Council admitted the reference — first hearing scheduled", createdAt: new Date(filedOn.getTime() + 28 * DAY) } });
      }
      if (stage === "award") {
        await prisma.event.createMany({ data: [
          { ...baseEvent, type: "hearing", title: "Council admitted the reference — hearing concluded", createdAt: new Date(filedOn.getTime() + 40 * DAY) },
          { ...baseEvent, type: "award", title: `MSEFC award passed — ₹${Math.round(totalDue).toLocaleString("en-IN")} decreed (§19 deposit bars appeal)`, createdAt: new Date(filedOn.getTime() + 61 * DAY) },
        ] });
      }
    }
  }

  await prisma.event.create({
    data: { orgId, type: "system", title: "Recovery OS switched on — monitoring all invoices" },
  });
}
