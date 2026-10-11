/**
 * Recovery OS — email delivery utility.
 * Uses Resend in production (RESEND_API_KEY env), falls back to console.log in dev.
 * This wires up the reminder engine so §16 demand letters actually get sent.
 */

type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  from?: string;
};

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; provider: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL ?? "recovery@recovery-os.in";

  // Dev fallback: log to console (no API key configured)
  if (!apiKey) {
    console.log("[email:dev-fallback]", { to: payload.to, subject: payload.subject, bodyPreview: payload.body.slice(0, 100) });
    return { ok: true, provider: "console" };
  }

  // Production: use Resend API
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: payload.from ?? fromEmail,
        to: payload.to,
        subject: payload.subject,
        text: payload.body,
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      return { ok: false, provider: "resend", error: err };
    }
    return { ok: true, provider: "resend" };
  } catch (e: any) {
    return { ok: false, provider: "resend", error: e?.message };
  }
}

/** Send a §16 statutory demand email to the buyer. */
export async function sendDemandLetter(opts: {
  buyerEmail: string;
  buyerName: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; provider: string; error?: string }> {
  return sendEmail({
    to: opts.buyerEmail,
    subject: opts.subject,
    body: opts.body,
  });
}

/** Send a notification email to the supplier (e.g. "your invoice is now overdue"). */
export async function sendSupplierNotification(opts: {
  supplierEmail: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; provider: string; error?: string }> {
  return sendEmail({
    to: opts.supplierEmail,
    subject: opts.subject,
    body: opts.body,
  });
}
