// M-Pesa Daraja (STK Push / Lipa Na M-Pesa Online) integration.
//
// Set these env vars to go live against Safaricom's sandbox or production API:
//   DARAJA_ENV=sandbox|production   (default: sandbox)
//   DARAJA_CONSUMER_KEY
//   DARAJA_CONSUMER_SECRET
//   DARAJA_SHORTCODE          (Paybill/Till number — the sandbox default below is Safaricom's shared test shortcode)
//   DARAJA_PASSKEY            (from your Daraja app's STK Push settings)
//   DARAJA_CALLBACK_URL       (a public HTTPS URL Safaricom can reach — e.g. your Render backend URL + /api/pro/callback)
//
// Without DARAJA_CONSUMER_KEY set, this module runs in MOCK MODE: no real
// request is sent, and the checkout resolves as "successful" after a short
// delay so you can build/test the full upgrade flow without Safaricom
// credentials or real money. Swap to real credentials before launch.

const DARAJA_ENV = process.env.DARAJA_ENV || "sandbox";
const BASE_URL = DARAJA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
const SHORTCODE = process.env.DARAJA_SHORTCODE || "174379"; // Safaricom's public sandbox test shortcode
const PASSKEY = process.env.DARAJA_PASSKEY;
const CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET;
const CALLBACK_URL = process.env.DARAJA_CALLBACK_URL || "https://example.com/api/pro/callback";

export const isMockMode = !CONSUMER_KEY;

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error("Failed to get Daraja access token");
  const data = await res.json();
  return data.access_token;
}

// Safaricom requires the M-Pesa number as digits only in international
// format with no "+" — e.g. 254712345678 — and rejects anything else with
// "Bad Request - Invalid PhoneNumber". ClearDay stores numbers as
// +254712345678, so sending the stored value straight through fails. This
// accepts whatever a person might type (0712 345 678, +254 712 345 678,
// 712345678...) and returns the exact shape Daraja wants, or null if it
// isn't a valid Safaricom-style number (254 followed by 7 or 1, then 8
// more digits).
export function toDarajaMsisdn(input) {
  let digits = String(input || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "254" + digits.slice(1);
  else if (/^[71]\d{8}$/.test(digits)) digits = "254" + digits;
  return /^254[71]\d{8}$/.test(digits) ? digits : null;
}

// Kicks off an STK push ("Lipa Na M-Pesa Online") prompt on the user's phone.
// Returns { checkoutRequestId } to correlate with the async callback.
export async function initiateStkPush({ phone, amount, accountReference, description }) {
  // Validated in mock mode too, on purpose — mock mode never talks to
  // Safaricom, so without this a badly formatted number would sail through
  // testing and only blow up once real credentials are set.
  const msisdn = toDarajaMsisdn(phone);
  if (!msisdn) {
    throw new Error("That doesn't look like a valid M-Pesa number. Use a Safaricom number like 0712 345 678.");
  }

  if (isMockMode) {
    const mockId = "MOCK-" + Math.random().toString(36).slice(2, 10).toUpperCase();
    console.log(`[Daraja MOCK] STK push to ${msisdn} for KES ${amount} -> checkoutRequestId=${mockId}`);
    return { checkoutRequestId: mockId, mock: true };
  }

  const ts = timestamp();
  const password = Buffer.from(`${SHORTCODE}${PASSKEY}${ts}`).toString("base64");
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: msisdn,
      PartyB: SHORTCODE,
      PhoneNumber: msisdn,
      CallBackURL: CALLBACK_URL,
      AccountReference: accountReference.slice(0, 12),
      TransactionDesc: description,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.ResponseCode !== "0") {
    throw new Error(data.errorMessage || data.ResponseDescription || "STK push failed");
  }
  return { checkoutRequestId: data.CheckoutRequestID, mock: false };
}

// In mock mode, simulate Safaricom's async callback arriving a couple seconds
// later, so the full "pending -> paid" UX can be tested end-to-end.
export function simulateMockCallback(checkoutRequestId, onResolve) {
  setTimeout(() => {
    onResolve({ checkoutRequestId, resultCode: 0, resultDesc: "The service request is processed successfully." });
  }, 3000);
}
