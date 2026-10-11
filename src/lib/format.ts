const enIN = "en-IN";

/** 1234567 -> "12,34,567" (Indian grouping) */
export function formatIndian(n: number, decimals = 0): string {
  return n.toLocaleString(enIN, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 1234567 -> "₹12,34,567" */
export function inr(n: number, decimals = 0): string {
  return "₹" + formatIndian(Math.max(0, n), decimals);
}

/**
 * MSMED Act, 2006 — Section 16: interest at 3x the RBI bank rate,
 * compounded monthly ("with monthly rests"), for the period the
 * payment remains overdue beyond the agreed/45-day term (Section 15).
 */
export const DEFAULT_BANK_RATE = 5.75; // % p.a., as notified by RBI from time to time

export function statutoryInterest(principal: number, days: number, bankRate = DEFAULT_BANK_RATE) {
  const annual = (bankRate * 3) / 100;
  const months = Math.max(0, days) / 30;
  const totalDue = principal * Math.pow(1 + annual / 12, months);
  const interest = totalDue - principal;
  return { interest, totalDue, annualPct: annual * 100 };
}
