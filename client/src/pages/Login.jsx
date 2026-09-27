import React, { useState } from "react";
import { api } from "../api.js";
import Logo from "../components/Logo.jsx";

export default function Login({ onLoggedIn }) {
  const [step, setStep] = useState("phone"); // phone | login | register | forgot | reset
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");

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

  async function handleForgotPin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.forgotPin(phone);
      setForgotMessage(res.message);
      setStep("reset");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPin(e) {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(resetNewPin)) return setError("New PIN must be 4-6 digits.");
    setLoading(true);
    setError("");
    try {
      await api.resetPin(phone, resetCode, resetNewPin);
      setStep("login");
      setPin("");
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Logo size={56} className="mb-4" />
      <h1 className="text-3xl font-bold text-ink mb-1">
        {step === "phone" ? "You're not alone" : "Welcome to ClearDay"}
      </h1>

      {step === "phone" && (
        <>
          <p className="text-muted mb-6">
            ClearDay is a free, private companion for anyone quitting smoking, alcohol, or gambling.
          </p>

          <ul className="space-y-3 mb-8">
            <li className="flex gap-3 text-sm text-ink">
              <span className="text-brand-600">✓</span>
              <span><strong>Always free</strong> — no paywalls on the core features.</span>
            </li>
            <li className="flex gap-3 text-sm text-ink">
              <span className="text-brand-600">✓</span>
              <span><strong>Private by design</strong> — just a phone number and a PIN, no real name required.</span>
            </li>
            <li className="flex gap-3 text-sm text-ink">
              <span className="text-brand-600">✓</span>
              <span><strong>All addictions welcome</strong> — smoking, alcohol, gambling, or just sober-curious.</span>
            </li>
            <li className="flex gap-3 text-sm text-ink">
              <span className="text-brand-600">✓</span>
              <span><strong>Real tools</strong> — streak tracking, daily check-ins, a craving toolkit, and verified support providers.</span>
            </li>
          </ul>

          <p className="text-muted mb-3">Enter your phone number to get started.</p>
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
            <button type="button" onClick={() => { setStep("forgot"); setError(""); }} className="w-full text-sm text-muted hover:text-ink">
              Forgot PIN?
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
            <p className="text-xs text-faint bg-subtlebg rounded-lg p-3">
              💡 Once you're in, add a recovery email from Settings. It's the only way to
              reset your PIN yourself if you forget it — without one, you'd need to contact
              support and wait for help.
            </p>
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

      {step === "forgot" && (
        <>
          <p className="text-muted mb-8">
            If you added a recovery email to this account, we'll send a reset code there.
          </p>
          <form onSubmit={handleForgotPin} className="space-y-4">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset code"}
            </button>
            <button type="button" onClick={() => setStep("login")} className="w-full text-sm text-muted hover:text-ink">
              Back
            </button>
          </form>
        </>
      )}

      {step === "reset" && (
        <>
          <p className="text-muted mb-2">{forgotMessage}</p>
          <p className="text-xs text-faint mb-6">
            No recovery email on file? The code won't arrive — contact support from the Resources
            page instead and we'll help you back in.
          </p>
          <form onSubmit={handleResetPin} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className="w-full rounded-lg border border-subtle px-3 py-2.5 tracking-widest text-center text-lg"
            />
            <input
              type="password"
              inputMode="numeric"
              value={resetNewPin}
              onChange={(e) => setResetNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="New PIN (4-6 digits)"
              className="w-full rounded-lg border border-subtle px-3 py-2.5 tracking-[0.5em] text-center text-xl"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? "Updating..." : "Set new PIN"}
            </button>
            <button type="button" onClick={resetToPhone} className="w-full text-sm text-muted hover:text-ink">
              Cancel
            </button>
          </form>
        </>
      )}

      {step === "phone" && (
        <p className="text-xs text-faint text-center mt-6">
          By continuing, you agree to our{" "}
          <a href="/legal/terms" className="underline hover:text-ink">Terms</a> and{" "}
          <a href="/legal/privacy" className="underline hover:text-ink">Privacy Policy</a>.
        </p>
      )}
    </div>
  );
}
