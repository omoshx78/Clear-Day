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

// Kicks off an STK push ("Lipa Na M-Pesa Online") prompt on the user's phone.
// Returns { checkoutRequestId } to correlate with the async callback.
export async function initiateStkPush({ phone, amount, accountReference, description }) {
  if (isMockMode) {
    const mockId = "MOCK-" + Math.random().toString(36).slice(2, 10).toUpperCase();
    console.log(`[Daraja MOCK] STK push to ${phone} for KES ${amount} -> checkoutRequestId=${mockId}`);
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
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
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
