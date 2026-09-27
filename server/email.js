// Email via Resend (https://resend.com) — free tier is 3,000/month, 100/day,
// no credit card required, and works out of the box from Resend's own
// onboarding@resend.dev sender without needing a verified custom domain
// (only needed if sending FROM your own domain, e.g. notifications@
// yourapp.com — not required for admin notifications or PIN-reset codes).
//
// Set RESEND_API_KEY as an env var to enable. Without it, this logs to the
// console instead of sending — same graceful-degradation pattern as
// server/daraja.js's mock mode, so nothing crashes if you haven't set this
// up yet, and you can still test the forgot-PIN flow end-to-end by reading
// the code out of the server logs.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.RESEND_FROM || "ClearDay <onboarding@resend.dev>";

export const isEmailMockMode = !RESEND_API_KEY;

export async function sendEmail({ to, subject, html }) {
  if (isEmailMockMode) {
    console.log(`[email MOCK] To: ${to}\nSubject: ${subject}\n${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`);
    return { mock: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend request failed (${res.status}): ${errText}`);
  }
  return res.json();
}
