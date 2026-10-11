import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSessionOrg } from "@/lib/session";
import { getSessionUser, audit, AUDIT } from "@/lib/auth";
import { prisma, invoiceInterest, daysOverdue, stageIndexOf } from "@/lib/recovery";

const DAY = 86_400_000;
const BANK_RATE = 5.75;
const ANNUAL = (BANK_RATE * 3) / 100;
const MONTHLY = ANNUAL / 12;

const INK = rgb(0.04, 0.08, 0.06);
const MINT = rgb(0.18, 0.94, 0.61);
const FLARE = rgb(0.98, 0.72, 0.18);
const ALERT = rgb(0.91, 0.27, 0.18);
const MUTED = rgb(0.42, 0.46, 0.43);
const HAIR = rgb(0.88, 0.9, 0.87);
const PALE = rgb(0.97, 0.99, 0.97);

const W = 595;
const H = 842;
const M_ = 56;

function rupee(n: number) {
  return "Rs. " + Math.round(n).toLocaleString("en-IN");
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
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/**
 * GET /api/invoices/compare/pdf?ids=id1,id2,id3
 * Generates a real PDF comparison report (side-by-side metrics table +
 * 90-day bleed projection summary + winner callout).
 */
export async function GET(req: Request) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });
  const user = await getSessionUser();

  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  if (ids.length < 2) {
    return NextResponse.json({ error: "Select at least 2 invoices to compare" }, { status: 400 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { id: { in: ids }, orgId: org.id },
    include: { buyer: true },
    orderBy: { amount: "desc" },
  });
  if (invoices.length === 0) {
    return NextResponse.json({ error: "No invoices found" }, { status: 404 });
  }

  const now = new Date();
  const items = invoices.map((inv) => {
    const od = daysOverdue({ dueOn: inv.dueOn }, now);
    const { interest, totalDue } = invoiceInterest(inv.amount, inv.dueOn, now);
    const future90 = inv.amount * Math.pow(1 + MONTHLY, (od + 90) / 30);
    const ninetyBleed = Math.max(0, Math.round(future90 - inv.amount - interest));
    return {
      number: inv.number,
      buyer: inv.buyer.name,
      gstin: inv.buyer.gstin,
      amount: inv.amount,
      status: inv.status,
      daysOverdue: od,
      interestNow: Math.round(interest),
      totalNow: Math.round(totalDue),
      ninetyBleed,
    };
  }).sort((a, b) => b.ninetyBleed - a.ninetyBleed);

  const winner = items[0];

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Helvetica);

  const page = pdf.addPage([W, H]);
  let y = H - M_;

  // header band
  page.drawRectangle({ x: 0, y: H - 4, width: W, height: 4, color: MINT });
  page.drawText("RECOVERY OS", { x: M_, y, size: 14, font: bold, color: INK });
  page.drawText("Invoice comparison report", { x: M_, y: y - 16, size: 8.5, font: regular, color: MUTED });
  page.drawText(fmtDate(now), { x: W - M_ - 80, y, size: 9, font: regular, color: MUTED });
  y -= 38;
  page.drawLine({ start: { x: M_, y }, end: { x: W - M_, y }, thickness: 0.5, color: HAIR });
  y -= 22;

  // title
  page.drawText("Side-by-side §16 forecast", { x: M_, y, size: 11, font: bold, color: INK });
  y -= 14;
  page.drawText(`${items.length} invoices compared · 90-day compound interest projection · 3× bank rate (${(ANNUAL * 100).toFixed(2)}% p.a.)`, { x: M_, y, size: 8.5, font: regular, color: MUTED });
  y -= 18;

  // winner callout
  const boxH = 48;
  page.drawRectangle({ x: M_, y: y - boxH, width: W - 2 * M_, height: boxH, borderColor: ALERT, borderWidth: 1, color: rgb(1, 0.97, 0.97) });
  page.drawText("FASTEST LEAK", { x: M_ + 14, y: y - 14, size: 7.5, font: bold, color: ALERT });
  page.drawText(`${winner.number} — ${winner.buyer}`, { x: M_ + 14, y: y - 26, size: 10, font: bold, color: INK });
  page.drawText(`bleeding ${rupee(winner.ninetyBleed)} over 90 days · recover it first`, { x: M_ + 14, y: y - 38, size: 9, font: regular, color: MUTED });
  y -= boxH + 20;

  // table header
  const cols = [
    { label: "Invoice", x: M_ + 4, w: 110 },
    { label: "Buyer", x: M_ + 120, w: 130 },
    { label: "Principal", x: M_ + 256, w: 70, align: "right" },
    { label: "§16 now", x: M_ + 332, w: 70, align: "right" },
    { label: "90d bleed", x: M_ + 408, w: 70, align: "right" },
    { label: "Total", x: M_ + 484, w: 55, align: "right" },
  ];
  page.drawRectangle({ x: M_, y: y - 18, width: W - 2 * M_, height: 18, color: rgb(0.95, 0.96, 0.94) });
  for (const c of cols) {
    page.drawText(c.label.toUpperCase(), { x: c.x, y: y - 13, size: 7, font: bold, color: MUTED });
  }
  y -= 20;

  // table rows
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (i % 2 === 1) {
      page.drawRectangle({ x: M_, y: y - 24, width: W - 2 * M_, height: 24, color: rgb(0.98, 0.99, 0.98) });
    }
    page.drawText(it.number, { x: cols[0].x, y: y - 14, size: 9, font: mono, color: INK });
    const buyerLines = wrap(it.buyer, regular, 9, cols[1].w);
    page.drawText(buyerLines[0], { x: cols[1].x, y: y - 14, size: 9, font: regular, color: INK });
    const pStr = rupee(it.amount);
    page.drawText(pStr, { x: cols[2].x + cols[2].w - mono.widthOfTextAtSize(pStr, 9), y: y - 14, size: 9, font: mono, color: INK });
    const iStr = rupee(it.interestNow);
    page.drawText(iStr, { x: cols[3].x + cols[3].w - mono.widthOfTextAtSize(iStr, 9), y: y - 14, size: 9, font: mono, color: FLARE });
    const bStr = rupee(it.ninetyBleed);
    page.drawText(bStr, { x: cols[4].x + cols[4].w - mono.widthOfTextAtSize(bStr, 9), y: y - 14, size: 9, font: bold, color: i === 0 ? ALERT : INK });
    const tStr = rupee(it.totalNow);
    page.drawText(tStr, { x: cols[5].x + cols[5].w - bold.widthOfTextAtSize(tStr, 9), y: y - 14, size: 9, font: bold, color: MINT });
    y -= 26;
  }

  y -= 10;
  page.drawLine({ start: { x: M_, y }, end: { x: W - M_, y }, thickness: 0.3, color: HAIR });
  y -= 18;

  // summary
  const totalPrincipal = items.reduce((s, i) => s + i.amount, 0);
  const totalInterest = items.reduce((s, i) => s + i.interestNow, 0);
  const totalBleed = items.reduce((s, i) => s + i.ninetyBleed, 0);
  const totalClaim = items.reduce((s, i) => s + i.totalNow, 0);

  page.drawText("PORTFOLIO SUMMARY", { x: M_, y, size: 8, font: bold, color: MUTED });
  y -= 16;
  const summaryRows = [
    ["Total principal", rupee(totalPrincipal)],
    ["§16 interest accrued now", rupee(totalInterest)],
    ["90-day projected bleed", rupee(totalBleed)],
    ["Total claimable (now)", rupee(totalClaim)],
  ];
  for (const [label, val] of summaryRows) {
    page.drawText(label, { x: M_, y, size: 9.5, font: regular, color: INK });
    const vStr = String(val);
    page.drawText(vStr, { x: W - M_ - 14 - mono.widthOfTextAtSize(vStr, 10), y, size: 10, font: bold, color: MINT });
    y -= 16;
  }

  // footer
  y = M_ + 20;
  page.drawLine({ start: { x: M_, y }, end: { x: W - M_, y }, thickness: 0.3, color: HAIR });
  page.drawText(`Issued by Recovery OS on behalf of ${org.name}.`, { x: M_, y: y - 12, size: 8, font: regular, color: MUTED });
  page.drawText(`Compound interest at 3× RBI bank rate (${(ANNUAL * 100).toFixed(2)}% p.a.), monthly rests (§16 MSMED Act, 2006).`, { x: M_, y: y - 22, size: 8, font: regular, color: MUTED });
  page.drawText("recovery-os.in", { x: W - M_ - 80, y: y - 12, size: 8, font: bold, color: MINT });

  pdf.setTitle(`Invoice comparison — ${items.length} invoices`);
  pdf.setAuthor("Recovery OS");
  pdf.setSubject("§16 forecast comparison");
  pdf.setProducer("Recovery OS");
  pdf.setCreationDate(now);

  await audit(org.id, user?.email ?? "anonymous", AUDIT.NOTICE_PDF, { kind: "comparison", count: items.length });

  const bytes = await pdf.save();
  return new NextResponse(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recovery-os-comparison-${now.toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
