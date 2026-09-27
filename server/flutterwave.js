import crypto from "crypto";

// Flutterwave Standard Checkout (v3 API) — a second payment option
// alongside direct M-Pesa Daraja (server/daraja.js). v3 remains the
// stable, documented production path for most Flutterwave integrations;
// v4 exists in beta with a different auth model (OAuth) and a different
// webhook signature scheme, deliberately not used here.
//
// Set FLUTTERWAVE_SECRET_KEY to enable. Without it, this runs in mock
// mode — same graceful-degradation pattern as daraja.js — so testing the
// full checkout -> verify -> Pro-activated flow doesn't require real
// credentials.

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_WEBHOOK_SECRET_HASH = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
// Where Flutterwave redirects the customer back to after checkout — must
// be a real, public URL once live (your Vercel frontend), not localhost.
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export const isFlutterwaveMockMode = !FLW_SECRET_KEY;

const BASE_URL = "https://api.flutterwave.com/v3";

// Kicks off a Standard Checkout — returns a hosted payment page link the
// frontend redirects the customer to. In mock mode, returns no link at
// all; the caller is expected to immediately treat the "payment" as
// successful instead (see the /api/pro/flutterwave/checkout route),
// since there's no real hosted page to send anyone to without live keys.
export async function initiateFlutterwaveCheckout({ txRef, amount, phone, email, name }) {
  if (isFlutterwaveMockMode) {
    return { mock: true, link: null };
  }

  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FLW_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: String(amount),
      currency: "KES",
      redirect_url: `${FRONTEND_URL}/upgrade`,
      customer: {
        email: email || "no-reply@cleardday.app", // Flutterwave requires an email even though ClearDay itself doesn't collect one
        phonenumber: phone,
        name: name || "ClearDay user",
      },
      customizations: { title: "ClearDay Pro" },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || `Flutterwave checkout init failed (${res.status})`);
  }
  return { mock: false, link: data.data.link };
}

// Always re-verify server-side with the secret key before granting Pro —
// never trust the redirect query params alone, since those are visible to
// (and forgeable by) the customer's own browser.
export async function verifyFlutterwaveTransaction(transactionId) {
  if (isFlutterwaveMockMode) {
    // Nothing to verify against in mock mode — the checkout route already
    // short-circuited to a simulated success without a real transaction id.
    return { status: "successful", amount: null, currency: "KES", txRef: null, mock: true };
  }

  const res = await fetch(`${BASE_URL}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || `Flutterwave verification failed (${res.status})`);
  }
  return {
    status: data.data.status, // "successful" | "failed" | ...
    amount: data.data.amount,
    currency: data.data.currency,
    txRef: data.data.tx_ref,
    mock: false,
  };
}

// v3 webhooks are authenticated with a plain shared secret (the
// "verif-hash" header) — not an HMAC signature like some other
// providers use. Configured in the Flutterwave dashboard under
// Settings -> Webhooks -> Secret Hash. Compared with a timing-safe
// equality check so the comparison itself can't leak the secret one
// character at a time via response-timing differences.
export function verifyFlutterwaveWebhookSignature(headerValue) {
  if (!FLW_WEBHOOK_SECRET_HASH || !headerValue) return false;
  const a = Buffer.from(String(headerValue));
  const b = Buffer.from(FLW_WEBHOOK_SECRET_HASH);
  if (a.length !== b.length) return false; // timingSafeEqual requires equal-length buffers
  return crypto.timingSafeEqual(a, b);
}
