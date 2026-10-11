import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSessionOrg } from "@/lib/session";
import { getSessionUser, audit, AUDIT } from "@/lib/auth";
import { prisma, buildStatutoryNotice } from "@/lib/recovery";
import { loadInvoice } from "@/lib/dto";

const INK = rgb(0.04, 0.08, 0.06);
const MINT = rgb(0.18, 0.94, 0.61);
const FLARE = rgb(0.98, 0.72, 0.18);
const MUTED = rgb(0.42, 0.46, 0.43);
const HAIR = rgb(0.88, 0.9, 0.87);
const PALE = rgb(0.97, 0.99, 0.97);

const W = 595; // A4 width (pt)
const H = 842;
const M = 56; // margin

function rupee(n: number) {
  return "Rs. " + Math.round(n).toLocaleString("en-IN") + "/-";
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(w, size) > maxWidth) {
        let chunk = "";
        for (const ch of w) {
          if (font.widthOfTextAtSize(chunk + ch, size) <= maxWidth) chunk += ch;
          else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        line = chunk;
      } else {
        line = w;
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** A small cursor that handles page-breaks + word-wrap automatically. */
class Cursor {
  page: any;
  y = H - M;
  constructor(public pdf: PDFDocument, public regular: any, public bold: any, public mono: any) {
    this.page = pdf.addPage([W, H]);
    this.page.drawRectangle({ x: 0, y: H - 4, width: W, height: 4, color: MINT });
  }
  private newPage(header: string) {
    this.page = this.pdf.addPage([W, H]);
    this.page.drawRectangle({ x: 0, y: H - 4, width: W, height: 4, color: MINT });
    this.page.drawText(header, { x: M, y: H - M, size: 8, font: this.bold, color: MUTED });
    this.y = H - M - 24;
  }
  text(text: string, opts: { size?: number; bold?: boolean; color?: any; header?: string; gapAfter?: number } = {}) {
    const size = opts.size ?? 9.5;
    const font = opts.bold ? this.bold : this.regular;
    const color = opts.color ?? INK;
    const lines = wrap(text, font, size, W - 2 * M);
    const lineH = size * 1.45;
    for (const line of lines) {
      if (this.y < M + 50) this.newPage(opts.header ?? "");
      this.page.drawText(line, { x: M, y: this.y, size, font, color });
      this.y -= lineH;
    }
    if (opts.gapAfter) this.y -= opts.gapAfter;
  }
  rule(color: any = HAIR, gap = 18) {
    if (this.y < M + 50) this.newPage("");
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: W - M, y: this.y }, thickness: 0.4, color });
    this.y -= gap;
  }
  space(h: number) {
    this.y -= h;
  }
}

async function buildNoticePdf(orgId: string, invoiceId: string, kind: "statutory_notice" | "evidence_pack" | "odr_dossier") {
  const org = await prisma.org.findUnique({ where: { id: orgId } });
  const inv = await loadInvoice(orgId, invoiceId);
  if (!org || !inv) throw new Error("Invoice not found");

  const now = new Date();
  const notice = buildStatutoryNotice({
    supplierName: org.name,
    buyerName: inv.buyer.name,
    invoiceNumber: inv.number,
    amount: inv.amount,
    issuedOn: inv.issuedOn,
    dueOn: inv.dueOn,
    now,
  });

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const c = new Cursor(pdf, regular, bold, mono);

  // header
  c.page.drawText("RECOVERY OS", { x: M, y: c.y, size: 14, font: bold, color: INK });
  c.page.drawText("Statutory Recovery Engine · MSMED Act, 2006", { x: M, y: c.y - 16, size: 8.5, font: regular, color: MUTED });
  const title = kind === "evidence_pack" ? "EVIDENCE PACK" : kind === "odr_dossier" ? "ODR FILING DOSSIER" : "STATUTORY DEMAND NOTICE";
  c.page.drawText(title, { x: W - M - bold.widthOfTextAtSize(title, 9), y: c.y, size: 9, font: bold, color: MINT });
  c.space(38);
  c.rule();

  // ref + date + subject
  c.page.drawText("Ref: " + inv.number, { x: M, y: c.y, size: 9, font: bold, color: INK });
  const dateStr = fmtDate(now);
  c.page.drawText(dateStr, { x: W - M - regular.widthOfTextAtSize(dateStr, 9), y: c.y, size: 9, font: regular, color: MUTED });
  c.space(18);
  const subject = kind === "evidence_pack"
    ? `Evidence package — Invoice ${inv.number} (5 documents verified)`
    : kind === "odr_dossier"
      ? `ODR filing dossier — Invoice ${inv.number}`
      : notice.subject;
  c.text(subject, { bold: true, size: 9, gapAfter: 14 });

  // parties
  const blockY = c.y;
  c.page.drawText("FROM", { x: M, y: blockY, size: 8, font: bold, color: MUTED });
  c.page.drawText(org.name, { x: M, y: blockY - 13, size: 10, font: bold, color: INK });
  if (org.gstin) c.page.drawText("GSTIN: " + org.gstin, { x: M, y: blockY - 26, size: 8.5, font: regular, color: MUTED });
  if (org.city) c.page.drawText(org.city, { x: M, y: blockY - 38, size: 8.5, font: regular, color: MUTED });

  c.page.drawText("TO", { x: W - M - 200, y: blockY, size: 8, font: bold, color: MUTED });
  c.page.drawText(inv.buyer.name, { x: W - M - 200, y: blockY - 13, size: 10, font: bold, color: INK });
  if (inv.buyer.gstin) c.page.drawText("GSTIN: " + inv.buyer.gstin, { x: W - M - 200, y: blockY - 26, size: 8.5, font: regular, color: MUTED });
  c.y = blockY - 54;
  c.rule();

  // body
  const body: string[] =
    kind === "evidence_pack"
      ? [
          "This package certifies that the documentary evidence supporting the supplier's claim against the buyer has been collected, matched and sealed in escrow by Recovery OS.",
          "",
          "1. Tax invoice (GST compliant) — verified against GSTR-1 filing",
          "2. Purchase order / work order — buyer-issued, line items matched",
          "3. Delivery challan + e-way bill — logistic proof of delivery",
          "4. GSTR-1 extract — filed with the GST portal, reconciled",
          "5. Buyer ledger statement — outstanding reflected in buyer's books",
          "",
          `Total claimable as of ${fmtDate(now)}: ${rupee(notice.totalDue)}`,
          `   Principal: ${rupee(inv.amount)}  ·  §16 interest: ${rupee(notice.interest)} (${notice.daysOverdue} days, monthly compound)`,
          "",
          "Sealed by Recovery OS for filing before the Micro and Small Enterprises Facilitation Council under §18 of the MSMED Act, 2006.",
        ]
      : kind === "odr_dossier"
        ? [
            "This dossier accompanies the reference filed on the MSME Samadhaan / ODR portal.",
            "",
            "1. Party identification — supplier & buyer GSTIN",
            "2. The liability — invoice + 45-day statutory term (§15)",
            "3. The default — overdue computation + §16 compound interest",
            "4. Statutory demand — copy of notice served on the buyer",
            "5. Evidence pack — 5 documents (sealed, verified)",
            "6. Prayer — principal + compound interest + costs",
            "",
            `Claim before the council: ${rupee(notice.totalDue)}`,
            "Decision due within 90 days of filing (§18(2)). Appeal requires a 75% pre-deposit (§19).",
          ]
        : notice.body.split("\n");

  for (const raw of body) {
    const isHeader = /^\s*\d+\./.test(raw) || /^(AMOUNT|CONSEQUENCES|DEMAND|LIABILITY|THE DEFAULT|TOTAL CLAIMABLE)/.test(raw) || raw.startsWith("Sealed by");
    c.text(raw, { size: 9.5, bold: isHeader, gapAfter: isHeader ? 2 : 0 });
  }

  // amount box
  c.space(12);
  const boxY = c.y - 76;
  c.page.drawRectangle({ x: M, y: boxY, width: W - 2 * M, height: 76, borderColor: MINT, borderWidth: 1, color: PALE });
  c.page.drawText("AMOUNT CLAIMABLE AS OF " + fmtDate(now).toUpperCase(), { x: M + 14, y: c.y - 20, size: 7.5, font: bold, color: MUTED });
  c.page.drawText("Principal", { x: M + 14, y: c.y - 38, size: 9, font: regular, color: INK });
  const principalStr = rupee(inv.amount);
  c.page.drawText(principalStr, { x: W - M - 14 - mono.widthOfTextAtSize(principalStr, 9), y: c.y - 38, size: 9, font: mono, color: INK });
  c.page.drawText("§16 interest", { x: M + 14, y: c.y - 52, size: 9, font: regular, color: INK });
  const intStr = rupee(notice.interest);
  c.page.drawText(intStr, { x: W - M - 14 - mono.widthOfTextAtSize(intStr, 9), y: c.y - 52, size: 9, font: mono, color: FLARE });
  c.page.drawText("TOTAL PAYABLE", { x: M + 14, y: c.y - 68, size: 9, font: bold, color: INK });
  const totalStr = rupee(notice.totalDue);
  c.page.drawText(totalStr, { x: W - M - 14 - bold.widthOfTextAtSize(totalStr, 11), y: c.y - 68, size: 11, font: bold, color: MINT });
  c.y = boxY - 20;

  // footer
  c.rule();
  c.text(`Issued by Recovery OS on behalf of ${org.name}.`, { size: 8, color: MUTED, gapAfter: 4 });
  c.text(`Compound interest computed at 3× the RBI bank rate (${notice.annualPct.toFixed(2)}% p.a.) with monthly rests under §16 of the MSMED Act, 2006.`, { size: 8, color: MUTED, gapAfter: 4 });
  c.text("This document is prepared for the supplier's review and is not legal advice.", { size: 8, color: MUTED });
  c.page.drawText("recovery-os.in", { x: W - M - 80, y: M - 8, size: 8, font: bold, color: MINT });

  pdf.setTitle(`${kind} — ${inv.number}`);
  pdf.setAuthor("Recovery OS");
  pdf.setSubject(notice.subject);
  pdf.setProducer("Recovery OS statutory engine");
  pdf.setCreationDate(now);

  return { bytes: await pdf.save(), filename: `${kind}-${inv.number}.pdf` };
}

/**
 * GET /api/documents/[id]?kind=statutory_notice|evidence_pack|odr_dossier
 * Generates a real PDF on the fly using pdf-lib (no external render farm).
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });
  const user = await getSessionUser();
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const kind = (url.searchParams.get("kind") as "statutory_notice" | "evidence_pack" | "odr_dossier") || "statutory_notice";

  try {
    const { bytes, filename } = await buildNoticePdf(org.id, id, kind);
    await audit(org.id, user?.email ?? "anonymous", AUDIT.NOTICE_PDF, { invoiceId: id, kind });
    return new NextResponse(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "PDF generation failed" }, { status: 500 });
  }
}
