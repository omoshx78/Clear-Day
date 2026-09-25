import React, { useState } from "react";
import { api } from "../api.js";

export default function Login({ onLoggedIn }) {
  const [step, setStep] = useState("phone"); // phone | code
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devHint, setDevHint] = useState("");

  async function sendOtp(e) {
    e.preventDefault();
    if (!phone.trim()) return setError("Enter your phone number.");
    setLoading(true);
    setError("");
    try {
      await api.requestOtp(phone);
      setStep("code");
      setDevHint("Dev mode: check the server console log for your code.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmOtp(e) {
    e.preventDefault();
    if (!code.trim()) return setError("Enter the code you received.");
    setLoading(true);
    setError("");
    try {
      const res = await api.verifyOtp(phone, code);
      localStorage.setItem("quitapp_token", res.token);
      localStorage.setItem("quitapp_user_id", res.userId);
      onLoggedIn(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-800 mb-1">Welcome to ClearDay</h1>
      <p className="text-slate-500 mb-8">
        {step === "phone"
          ? "Enter your phone number to get started. No names needed."
          : `Enter the code sent to ${phone}.`}
      </p>

      {step === "phone" ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 0712 345 678"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={confirmOtp} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {devHint && <p className="text-xs text-amber-600">{devHint}</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify & continue"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("phone"); setCode(""); setError(""); }}
            className="w-full text-sm text-slate-400 hover:text-slate-600"
          >
            Use a different number
          </button>
        </form>
      )}
    </div>
  );
}
