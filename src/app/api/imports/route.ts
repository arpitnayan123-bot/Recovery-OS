import { NextResponse } from "next/server";
import { getSessionOrg } from "@/lib/session";
import { getSessionUser, audit, AUDIT } from "@/lib/auth";
import { prisma } from "@/lib/recovery";
import { daysOverdue } from "@/lib/domain";

const DAY = 86_400_000;

/** Minimal RFC-4180-ish CSV parser (handles quoted fields with embedded commas/newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const COL_ALIASES: Record<string, string> = {
  buyer: "buyer",
  buyername: "buyer",
  buyer_name: "buyer",
  party: "buyer",
  customer: "buyer",
  number: "number",
  invoice: "number",
  invoiceno: "number",
  invoice_no: "number",
  invoicenumber: "number",
  amount: "amount",
  value: "amount",
  total: "amount",
  issuedon: "issuedOn",
  issued_on: "issuedOn",
  date: "issuedOn",
  invoicedate: "issuedOn",
  invoice_date: "issuedOn",
  gstin: "gstin",
  buyergstin: "gstin",
  buyer_gstin: "gstin",
  city: "city",
};

function normalizeHeader(h: string): string {
  const key = h.trim().toLowerCase().replace(/[\s-]/g, "");
  return COL_ALIASES[key] ?? COL_ALIASES[h.trim().toLowerCase()] ?? h.trim().toLowerCase();
}

type RowError = { row: number; message: string };

/**
 * POST /api/imports — multipart upload of a CSV (file field "file").
 * Columns accepted (case/whitespace-insensitive aliases): buyer, number, amount,
 * issuedOn (date), gstin, city. Invoices are deduped by (orgId, number).
 */
export async function POST(req: Request) {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });
  const user = await getSessionUser();

  const form = await req.formData();
  const file = form.get("file");
  const sourceRaw = String(form.get("source") || "csv");
  const source = ["csv", "tally", "zoho"].includes(sourceRaw) ? sourceRaw : "csv";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a CSV file under the 'file' field" }, { status: 400 });
  }
  if (file.size > 2_000_000) {
    return NextResponse.json({ error: "CSV must be under 2MB" }, { status: 413 });
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV needs a header row plus at least one invoice" }, { status: 400 });
  }

  const headers = rows[0].map(normalizeHeader);
  const idx = (key: string) => headers.indexOf(key);

  const bIdx = idx("buyer");
  const nIdx = idx("number");
  const aIdx = idx("amount");
  if (bIdx === -1 || nIdx === -1 || aIdx === -1) {
    return NextResponse.json(
      { error: `CSV must include buyer, number and amount columns (found: ${headers.join(", ")})` },
      { status: 400 },
    );
  }
  const dIdx = idx("issuedOn");
  const gIdx = idx("gstin");
  const cIdx = idx("city");

  // existing invoice numbers for this org — dedupe in one pass
  const existing = await prisma.invoice.findMany({
    where: { orgId: org.id },
    select: { number: true },
  });
  const seen = new Set(existing.map((i) => i.number));
  const buyerCache = new Map<string, string>();

  let created = 0;
  let skipped = 0;
  const errors: RowError[] = [];
  const dataRows = rows.slice(1);

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    const buyerName = (row[bIdx] ?? "").trim();
    const number = (row[nIdx] ?? "").trim();
    const amountStr = (row[aIdx] ?? "").trim().replace(/[₹,\s]/g, "");
    const amount = Number(amountStr);

    if (!buyerName || !number) {
      errors.push({ row: r + 2, message: "missing buyer or invoice number" });
      continue;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ row: r + 2, message: `invalid amount "${row[aIdx]}"` });
      continue;
    }

    if (seen.has(number)) {
      skipped++;
      continue;
    }

    let issuedOn = new Date();
    if (dIdx !== -1 && row[dIdx]) {
      const parsed = new Date(row[dIdx]);
      if (!Number.isNaN(parsed.getTime())) issuedOn = parsed;
    }
    const dueOn = new Date(issuedOn.getTime() + 45 * DAY);
    const gstin = gIdx !== -1 ? row[gIdx]?.trim().toUpperCase().replace(/\s/g, "") || null : null;
    const city = cIdx !== -1 ? row[cIdx]?.trim() || null : null;

    let buyerId = buyerCache.get(buyerName);
    if (!buyerId) {
      const buyer = await prisma.buyer.upsert({
        where: { orgId_name: { orgId: org.id, name: buyerName } },
        create: { orgId: org.id, name: buyerName, gstin, city },
        update: { ...(gstin ? { gstin } : {}), ...(city ? { city } : {}) },
      });
      buyerId = buyer.id;
      buyerCache.set(buyerName, buyerId);
    }

    const inv = await prisma.invoice.create({
      data: { orgId: org.id, buyerId, number, amount, issuedOn, dueOn, status: "watch" },
    });
    seen.add(number);

    await prisma.event.create({
      data: { orgId: org.id, invoiceId: inv.id, type: "sync", title: `Invoice ${number} imported — ₹${Math.round(amount).toLocaleString("en-IN")}`, detail: `via ${source} import` },
    });
    if (daysOverdue({ dueOn }) > 0) {
      await prisma.event.create({
        data: { orgId: org.id, invoiceId: inv.id, type: "detect", title: `${buyerName} crossed day 45 — §16 interest now accruing` },
      });
    }
    created++;
  }

  const batch = await prisma.importBatch.create({
    data: { orgId: org.id, filename: file.name, source, total: dataRows.length, created, skipped, errors: JSON.stringify(errors) },
  });
  await audit(org.id, user?.email ?? "anonymous", AUDIT.IMPORT, { batch: batch.id, file: file.name, created, skipped, errors: errors.length });

  return NextResponse.json({
    batch: { id: batch.id, filename: batch.filename, total: batch.total, created, skipped, errors },
    message: `Imported ${created} invoice${created === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}` : ""}${errors.length ? `, ${errors.length} row${errors.length === 1 ? "" : "s"} had errors` : ""}.`,
  });
}

/** GET /api/imports — list this org's import batches. */
export async function GET() {
  const org = await getSessionOrg();
  if (!org) return NextResponse.json({ error: "No session" }, { status: 401 });
  const batches = await prisma.importBatch.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  return NextResponse.json({
    batches: batches.map((b) => ({
      ...b,
      errors: JSON.parse(b.errors || "[]") as RowError[],
    })),
  });
}
