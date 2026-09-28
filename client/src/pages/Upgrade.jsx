import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import BackBar from "../components/BackBar.jsx";

export default function Upgrade() {
  const [plan, setPlan] = useState(null);
  const [flwInfo, setFlwInfo] = useState(null);
  const [status, setStatus] = useState(null);
  const [checkoutState, setCheckoutState] = useState("idle"); // idle | pending | verifying | paid | failed
  const [mpesaFormOpen, setMpesaFormOpen] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    api.getProPlan().then(setPlan).catch(() => {});
    api.getProStatus().then(setStatus).catch(() => {});
    api.getFlutterwaveInfo().then(setFlwInfo).catch(() => {});
    // Pre-fill the M-Pesa number with the account number (shown as 07XX...),
    // but keep it editable — some people use a different SIM for M-Pesa.
    api.getMe().then((u) => {
      if (u?.phone) setMpesaPhone(u.phone.replace(/^\+254/, "0"));
    }).catch(() => {});
  }, []);

  // Land back here after a real (non-mock) Flutterwave checkout —
  // Flutterwave appends these as query params on redirect. Verify
  // server-side before treating the payment as real; never trust these
  // params alone, since they're visible to (and forgeable by) the browser.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const transactionId = params.get("transaction_id");
    const txRef = params.get("tx_ref");
    if (!transactionId || !txRef) return;

    setCheckoutState("verifying");
    api
      .verifyFlutterwavePayment(transactionId, txRef)
      .then((res) => {
        if (res.ok) {
          setCheckoutState("paid");
          api.getProStatus().then(setStatus);
        } else {
          setCheckoutState("failed");
          setError("Payment could not be confirmed. If you were charged, contact support.");
        }
      })
      .catch((err) => {
        setCheckoutState("failed");
        setError(err.message);
      })
      .finally(() => {
        // Clean the URL so a refresh doesn't re-trigger verification
        navigate("/upgrade", { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startMpesaCheckout() {
    setError("");
    if (!mpesaPhone.trim()) {
      setError("Enter the M-Pesa number that should receive the prompt.");
      return;
    }
    setCheckoutState("pending");
    try {
      const res = await api.startProCheckout(mpesaPhone);
      setMessage(res.message);
      pollMpesa(res.checkoutRequestId);
    } catch (err) {
      setError(err.message);
      setCheckoutState("idle");
    }
  }

  function pollMpesa(checkoutRequestId, attempt = 0) {
    if (attempt > 20) {
      setCheckoutState("failed");
      setError("Payment timed out. Please try again.");
      return;
    }
    setTimeout(async () => {
      try {
        const payment = await api.pollCheckout(checkoutRequestId);
        if (payment.status === "paid") {
          setCheckoutState("paid");
          const s = await api.getProStatus();
          setStatus(s);
        } else if (payment.status === "failed") {
          setCheckoutState("failed");
          setError(payment.resultDesc || "Payment was not completed.");
        } else {
          pollMpesa(checkoutRequestId, attempt + 1);
        }
      } catch (err) {
        setError(err.message);
        setCheckoutState("failed");
      }
    }, 1500);
  }

  async function startFlutterwaveCheckout() {
    setError("");
    setCheckoutState("pending");
    try {
      const res = await api.startFlutterwaveCheckout();
      if (res.mock) {
        setMessage(res.message);
        setCheckoutState("paid");
        const s = await api.getProStatus();
        setStatus(s);
      } else {
        window.location.href = res.link; // off to Flutterwave's hosted checkout
      }
    } catch (err) {
      setError(err.message);
      setCheckoutState("idle");
    }
  }

  if (!plan) return <p className="max-w-md mx-auto px-4 py-12 text-faint">Loading...</p>;

  if (status?.isPro || checkoutState === "paid") {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-5xl">🎉</p>
        <h1 className="text-2xl font-bold text-ink">You're on ClearDay Pro</h1>
        <p className="text-muted text-sm">
          Active until {new Date(status?.proExpiresAt || status?.proExpiresAt).toLocaleDateString()}.
        </p>
        <a href="/dashboard" className="inline-block mt-4 text-brand-600 font-semibold hover:underline">
          Back to dashboard →
        </a>
      </div>
    );
  }

  return (
    <>
      <BackBar />
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-ink mb-1">{plan.label}</h1>
        <p className="text-muted mb-6">KES {plan.priceKes} / {plan.periodDays} days</p>

        <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5 mb-6">
          <ul className="space-y-2">
            {plan.features.map((f, i) => (
              <li key={i} className="text-sm text-muted flex gap-2">
                <span className="text-brand-600">✓</span>{f}
              </li>
            ))}
          </ul>
        </div>

        {checkoutState === "idle" && (
          <div className="space-y-3">
            {plan.mockMode && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                M-Pesa dev mode: no real Daraja credentials configured, so this will
                simulate a successful payment after a few seconds instead of a real STK push.
              </p>
            )}
            {!mpesaFormOpen ? (
              <button
                onClick={() => setMpesaFormOpen(true)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition"
              >
                Pay with M-Pesa
              </button>
            ) : (
              <div className="bg-surface rounded-2xl border border-subtle p-4 space-y-3">
                <label className="block text-sm font-semibold text-ink">
                  M-Pesa number to send the prompt to
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="e.g. 0712 345 678"
                  className="w-full rounded-lg border border-subtle px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-faint">
                  Use the Safaricom number registered with M-Pesa — it doesn't have to be
                  the same number you log in with.
                </p>
                <button
                  onClick={startMpesaCheckout}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition"
                >
                  Send M-Pesa prompt · KES {plan.priceKes}
                </button>
              </div>
            )}

            {flwInfo?.mockMode && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                Flutterwave dev mode: no real credentials configured, so this will
                simulate a successful payment immediately instead of opening real checkout.
              </p>
            )}
            <button
              onClick={startFlutterwaveCheckout}
              className="w-full bg-subtlebg hover:bg-subtle text-ink font-semibold py-3 rounded-xl transition border border-subtle"
            >
              Pay with Flutterwave
            </button>
            <p className="text-xs text-faint text-center">Cards, bank transfer, and mobile money via Flutterwave</p>
          </div>
        )}

        {checkoutState === "pending" && (
          <div className="text-center space-y-3 py-6">
            <div className="w-10 h-10 mx-auto rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
            <p className="text-sm text-muted">{message || "Waiting for payment..."}</p>
            <p className="text-xs text-faint">Check your phone for the M-Pesa PIN prompt.</p>
          </div>
        )}

        {checkoutState === "verifying" && (
          <div className="text-center space-y-3 py-6">
            <div className="w-10 h-10 mx-auto rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
            <p className="text-sm text-muted">Confirming your payment...</p>
          </div>
        )}

        {checkoutState === "failed" && (
          <div className="text-center space-y-3">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={() => setCheckoutState("idle")}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition"
            >
              Try again
            </button>
          </div>
        )}

        {error && checkoutState === "idle" && <p className="text-sm text-red-500 mt-3">{error}</p>}
      </div>
    </>
  );
}
