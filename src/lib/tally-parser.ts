/**
 * Recovery OS — Tally Prime XML parser.
 * Parses Tally's XML export format (envelope/request/data/message/VOUCHER)
 * and extracts invoice rows for ingestion into Recovery OS.
 */

export type TallyInvoice = {
  buyer: string;
  number: string;
  amount: number;
  issuedOn: string; // ISO date
  gstin?: string;
};

/** Parse a Tally date (DDMMYYYY or DD-MM-YYYY) → ISO date string */
function parseTallyDate(raw: string): string {
  const clean = raw.replace(/[^0-9]/g, "");
  if (clean.length !== 8) return new Date().toISOString().slice(0, 10);
  const dd = clean.slice(0, 2);
  const mm = clean.slice(2, 4);
  const yyyy = clean.slice(4, 8);
  return `${yyyy}-${mm}-${dd}`;
}

/** Parse a Tally amount string (may contain commas, ₹, spaces, negative) → number */
function parseAmount(raw: string): number {
  const clean = raw.replace(/[₹,\s]/g, "").replace(/\(?(-?\d+\.?\d*)\)?/, "$1");
  const num = Number(clean);
  return Number.isFinite(num) ? Math.abs(num) : 0;
}

/**
 * Parse a Tally Prime XML export string and return invoice rows.
 * Tally exports vouchers in <ENVELOPE><BODY><DATA><TALLYMESSAGE><VOUCHER> tags.
 * Each VOUCHER has attributes: VOUCHERNUMBER, PARTYNAME, DATE, and child LEDGERENTRIES.LIST with AMOUNT.
 */
export function parseTallyXML(xml: string): TallyInvoice[] {
  const invoices: TallyInvoice[] = [];

  try {
    // Tally XML is not always well-formed; use regex extraction as fallback
    const voucherRegex = /<VOUCHER\b[^>]*>([\s\S]*?)<\/VOUCHER>/gi;
    let match: RegExpExecArray | null;

    while ((match = voucherRegex.exec(xml)) !== null) {
      const block = match[1];

      // Extract VOUCHERNUMBER (may be an attribute or a child element)
      const numMatch = block.match(/<VOUCHERNUMBER>([^<]+)<\/VOUCHERNUMBER>/i)
        || match[0].match(/VOUCHERNUMBER\s*=\s*"([^"]+)"/i);
      const number = numMatch ? numMatch[1].trim() : `TALLY-${invoices.length + 1}`;
      if (!number || number === "-") continue;

      // Extract PARTYNAME
      const partyMatch = block.match(/<PARTYNAME>([^<]+)<\/PARTYNAME>/i)
        || block.match(/<PARTYLEDGERNAME>([^<]+)<\/PARTYLEDGERNAME>/i);
      const buyer = partyMatch ? partyMatch[1].trim() : "Unknown Buyer";
      if (!buyer || buyer === "-") continue;

      // Extract DATE (DDMMYYYY format in Tally)
      const dateMatch = block.match(/<DATE>([^<]+)<\/DATE>/i)
        || match[0].match(/DATE\s*=\s*"([^"]+)"/i);
      const issuedOn = dateMatch ? parseTallyDate(dateMatch[1].trim()) : new Date().toISOString().slice(0, 10);

      // Extract amount from LEDGERENTRIES.LIST > AMOUNT
      const amountMatches = block.matchAll(/<LEDGERENTRIES\.LIST>[\s\S]*?<AMOUNT>([^<]+)<\/AMOUNT>/gi);
      let totalAmount = 0;
      for (const am of amountMatches) {
        const amt = parseAmount(am[1]);
        if (amt > 0) totalAmount += amt; // sum positive entries (debits to party)
      }

      // If no amount found in LEDGERENTRIES, try basic AMOUNT tag
      if (totalAmount === 0) {
        const basicAmt = block.match(/<AMOUNT>([^<]+)<\/AMOUNT>/i);
        if (basicAmt) totalAmount = parseAmount(basicAmt[1]);
      }

      // Try to extract GSTIN from party's GSTIN tag
      const gstinMatch = block.match(/<PARTYGSTIN>([^<]+)<\/PARTYGSTIN>/i)
        || block.match(/<GSTIN>([^<]+)<\/GSTIN>/i);
      const gstin = gstinMatch ? gstinMatch[1].trim().toUpperCase() : undefined;

      if (totalAmount > 0) {
        invoices.push({ buyer, number, amount: totalAmount, issuedOn, gstin });
      }
    }
  } catch (e) {
    console.error("[tally-parser] XML parse error:", e);
  }

  return invoices;
}

/**
 * Detect whether the uploaded file is a Tally XML export.
 * Tally exports start with <?xml and contain <ENVELOPE or <TALLYMESSAGE.
 */
export function isTallyXml(content: string): boolean {
  return content.trim().startsWith("<?xml") && /<ENVELOPE|<TALLYMESSAGE|<VOUCHER/i.test(content);
}
