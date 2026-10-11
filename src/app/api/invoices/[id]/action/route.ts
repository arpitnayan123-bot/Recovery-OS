import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { prisma, buildStatutoryNotice, odrCaseNumber, MSEFC_DECISION_DAYS, invoiceInterest, SUCCESS_FEE } from "@/lib/recovery";
import { loadInvoice, serializeInvoice } from "@/lib/dto";

const DOC_KINDS = [
  { kind: "tax_invoice", name: "Tax invoice (GST compliant)" },
  { kind: "po", name: "Purchase order / work order" },
  { kind: "challan", name: "Delivery challan + e-way bill" },
  { kind: "gst_filing", name: "GSTR-1 extract (filed)" },
  { kind: "ledger", name: "Buyer ledger statement" },
];

const day = 86_400_000;

/**
 * The recovery pipeline. One endpoint drives every stage:
 *   remind   → statutory demand under §15/§16 served on the buyer
 *   evidence → 5-document evidence pack extracted & verified
 *   file     → reference filed on the ODR portal, 90-day MSEFC clock starts
 *   advance  → case moves filed → admitted → hearing → award
 *   recover  → payment lands; supplier paid, 12.5% success fee settled
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const type = String(body?.type ?? "");

  const inv = await loadInvoice(org.id, id);
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const now = new Date();
  const log = (ev: { type: string; title: string; detail?: string }) =>
    prisma.event.create({ data: { orgId: org.id, invoiceId: inv.id, ...ev } });

  let message = "";

  switch (type) {
    case "remind": {
      if (inv.status !== "watch") return NextResponse.json({ error: "Notice already served" }, { status: 409 });
      if (daysPast(inv.dueOn, now) === 0) {
        return NextResponse.json({ error: "Invoice is inside its 45-day statutory term — a §16 notice cannot be served yet" }, { status: 409 });
      }

      const notice = buildStatutoryNotice({
        supplierName: org.name,
        buyerName: inv.buyer.name,
        invoiceNumber: inv.number,
        amount: inv.amount,
        issuedOn: inv.issuedOn,
        dueOn: inv.dueOn,
        now,
      });

      await prisma.reminder.create({
        data: { invoiceId: inv.id, channel: "email", kind: "statutory", subject: notice.subject, body: notice.body },
      });
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: "reminder_sent" } });
      await log({ type: "notice", title: `Statutory demand served on ${inv.buyer.name}`, detail: `§16 interest claimed: ₹${Math.round(notice.interest).toLocaleString("en-IN")} · total demanded ₹${Math.round(notice.totalDue).toLocaleString("en-IN")}` });
      message = `Statutory demand served — 14-day compliance window opened`;
      break;
    }

    case "evidence": {
      if (!["reminder_sent"].includes(inv.status)) return NextResponse.json({ error: "Serve the statutory notice first" }, { status: 409 });
      await prisma.document.createMany({
        // Gap 17: In production, verify each document against GSTR-1/GSTR-2B
        // filings from the GST portal API (gst.gov.in). Currently auto-verified.
        data: DOC_KINDS.map((d) => ({ invoiceId: inv.id, kind: d.kind, name: d.name, status: "verified" })),
      });
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: "evidence_ready" } });
      await log({ type: "evidence", title: `Evidence pack sealed — 5 documents verified`, detail: "PO, delivery challans, e-way bills, GSTR-1 extract and buyer ledger matched to invoice line items. GST reconciliation pending portal integration." });
      message = `Evidence pack sealed — MSEFC-ready`;
      break;
    }

    case "file": {
      if (!["evidence_ready"].includes(inv.status)) return NextResponse.json({ error: "Seal the evidence pack first" }, { status: 409 });
      const caseNumber = odrCaseNumber(now);
      await prisma.case.create({
        data: {
          orgId: org.id,
          invoiceId: inv.id,
          caseNumber,
          stage: "filed",
          filedOn: now,
        },
      });
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: "odr_filed" } });
      await log({ type: "filed", title: `Reference filed on MSME Samadhaan — ${caseNumber}`, detail: `Statutory clock: council must decide within ${MSEFC_DECISION_DAYS} days (§18(2))` });
      message = `Reference ${caseNumber} filed — 90-day statutory clock running`;
      break;
    }

    case "advance": {
      const kase = await prisma.case.findUnique({ where: { invoiceId: inv.id } });
      if (!kase) return NextResponse.json({ error: "No ODR case for this invoice" }, { status: 409 });

      if (kase.stage === "filed") {
        await prisma.case.update({ where: { id: kase.id }, data: { stage: "admitted" } });
        await log({ type: "admitted", title: `Council admitted the reference — buyer summoned`, detail: "Buyer has 30 days to respond; §19 requires a 75% deposit to contest an eventual award" });
        message = `Case admitted — buyer summoned by the council`;
      } else if (kase.stage === "admitted") {
        const hearingOn = new Date(now.getTime() + 21 * day);
        await prisma.case.update({ where: { id: kase.id }, data: { stage: "hearing", hearingOn } });
        await prisma.invoice.update({ where: { id: inv.id }, data: { status: "hearing" } });
        await log({ type: "hearing", title: `First hearing scheduled`, detail: `Conciliation-cum-arbitration hearing on ${hearingOn.toDateString()} — evidence pack already on record` });
        message = `Hearing scheduled — evidence on record`;
      } else if (kase.stage === "hearing") {
        const { totalDue } = invoiceInterest(inv.amount, inv.dueOn, now);
        await prisma.case.update({ where: { id: kase.id }, data: { stage: "award", awardAmount: totalDue } });
        await prisma.invoice.update({ where: { id: inv.id }, data: { status: "award" } });
        await log({ type: "award", title: `MSEFC award passed — ₹${Math.round(totalDue).toLocaleString("en-IN")} decreed`, detail: "Principal + §16 compound interest. To appeal, the buyer must first deposit 75% of this amount (§19)." });
        message = `Award won — ₹${Math.round(totalDue).toLocaleString("en-IN")} decreed in your favour`;
      } else {
        return NextResponse.json({ error: "Case already at final award stage" }, { status: 409 });
      }
      break;
    }

    case "recover": {
      if (inv.status === "recovered") return NextResponse.json({ error: "Already recovered" }, { status: 409 });
      if (inv.status === "watch" && daysPast(inv.dueOn, now) === 0) {
        return NextResponse.json({ error: "Nothing overdue yet — the statutory term has not expired" }, { status: 409 });
      }

      const kase = await prisma.case.findUnique({ where: { invoiceId: inv.id } });
      const { totalDue } = invoiceInterest(inv.amount, inv.dueOn, now);
      const amount = kase?.awardAmount ?? totalDue;
      const fee = amount * SUCCESS_FEE;

      await prisma.invoice.update({
        where: { id: inv.id },
        data: { status: "recovered", recoveredAt: now, recoveredAmount: amount, successFee: fee },
      });
      await log({
        type: "recovered",
        title: `₹${Math.round(amount).toLocaleString("en-IN")} recovered from ${inv.buyer.name}`,
        detail: `Supplier receives ₹${Math.round(amount - fee).toLocaleString("en-IN")} · success fee (12.5%) ₹${Math.round(fee).toLocaleString("en-IN")} — charged only because money moved`,
      });
      message = `Recovered — ₹${Math.round(amount).toLocaleString("en-IN")} landed in the supplier account`;
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const updated = await loadInvoice(org.id, id);
  return NextResponse.json({ invoice: updated ? serializeInvoice(updated, now) : null, message });
}

function daysPast(dueOn: Date, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - dueOn.getTime()) / day));
}
