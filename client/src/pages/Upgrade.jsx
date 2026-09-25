import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Upgrade() {
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState(null);
  const [checkoutState, setCheckoutState] = useState("idle"); // idle | pending | paid | failed
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.getProPlan().then(setPlan).catch(() => {});
    api.getProStatus().then(setStatus).catch(() => {});
  }, []);

  async function startCheckout() {
    setError("");
    setCheckoutState("pending");
    try {
      const res = await api.startProCheckout();
      setMessage(res.message);
      poll(res.checkoutRequestId);
    } catch (err) {
      setError(err.message);
      setCheckoutState("idle");
    }
  }

  function poll(checkoutRequestId, attempt = 0) {
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
          poll(checkoutRequestId, attempt + 1);
        }
      } catch (err) {
        setError(err.message);
        setCheckoutState("failed");
      }
    }, 1500);
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

      {plan.mockMode && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 mb-4">
          Dev mode: no real M-Pesa credentials configured, so this will simulate a
          successful payment after a few seconds instead of sending a real STK push.
        </p>
      )}

      {checkoutState === "idle" && (
        <button
          onClick={startCheckout}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition"
        >
          Pay with M-Pesa
        </button>
      )}

      {checkoutState === "pending" && (
        <div className="text-center space-y-3 py-6">
          <div className="w-10 h-10 mx-auto rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
          <p className="text-sm text-muted">{message || "Waiting for payment..."}</p>
          <p className="text-xs text-faint">Check your phone for the M-Pesa PIN prompt.</p>
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
  );
}
