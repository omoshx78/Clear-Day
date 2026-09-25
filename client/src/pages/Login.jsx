import React, { useState } from "react";
import { api } from "../api.js";

export default function Login({ onLoggedIn }) {
  const [step, setStep] = useState("phone"); // phone | login | register
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    if (!phone.trim()) return setError("Enter your phone number.");
    setLoading(true);
    setError("");
    try {
      const { exists } = await api.checkPhone(phone);
      setStep(exists ? "login" : "register");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!pin.trim()) return setError("Enter your PIN.");
    setLoading(true);
    setError("");
    try {
      const res = await api.login(phone, pin);
      localStorage.setItem("quitapp_token", res.token);
      localStorage.setItem("quitapp_user_id", res.userId);
      onLoggedIn(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) return setError("PIN must be 4-6 digits.");
    if (pin !== confirmPin) return setError("PINs don't match.");
    if (!ageConfirmed) return setError("Please confirm you're 18 or older to continue.");
    setLoading(true);
    setError("");
    try {
      const res = await api.register(phone, pin, ageConfirmed);
      localStorage.setItem("quitapp_token", res.token);
      localStorage.setItem("quitapp_user_id", res.userId);
      onLoggedIn(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function resetToPhone() {
    setStep("phone");
    setPin("");
    setConfirmPin("");
    setAgeConfirmed(false);
    setError("");
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-ink mb-1">Welcome to ClearDay</h1>

      {step === "phone" && (
        <>
          <p className="text-muted mb-8">Enter your phone number to get started. No names needed.</p>
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712 345 678"
              className="w-full rounded-lg border border-subtle px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? "Checking..." : "Continue"}
            </button>
          </form>
        </>
      )}

      {step === "login" && (
        <>
          <p className="text-muted mb-8">Enter your PIN to continue.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="PIN"
              className="w-full rounded-lg border border-subtle px-3 py-2.5 tracking-[0.5em] text-center text-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? "Checking..." : "Log in"}
            </button>
            <button type="button" onClick={resetToPhone} className="w-full text-sm text-muted hover:text-ink">
              Use a different number
            </button>
          </form>
        </>
      )}

      {step === "register" && (
        <>
          <p className="text-muted mb-8">First time here — create a PIN to protect your account.</p>
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Create a 4-6 digit PIN"
              className="w-full rounded-lg border border-subtle px-3 py-2.5 tracking-[0.5em] text-center text-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Confirm PIN"
              className="w-full rounded-lg border border-subtle px-3 py-2.5 tracking-[0.5em] text-center text-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <label className="flex items-start gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              I confirm I am 18 years of age or older.
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Create account"}
            </button>
            <button type="button" onClick={resetToPhone} className="w-full text-sm text-muted hover:text-ink">
              Use a different number
            </button>
          </form>
        </>
      )}
    </div>
  );
}
