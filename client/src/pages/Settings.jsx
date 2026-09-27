import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api.js";
import BackBar from "../components/BackBar.jsx";

const ADDICTIONS = [
  { id: "smoking", label: "Smoking" },
  { id: "alcohol", label: "Alcohol" },
  { id: "gambling", label: "Gambling / Betting" },
];

function Section({ title, children }) {
  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5">
      <p className="text-sm font-semibold text-ink mb-3">{title}</p>
      {children}
    </div>
  );
}

export default function Settings({ onLoggedOut }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Profile fields
  const [addiction, setAddiction] = useState("");
  const [goalDays, setGoalDays] = useState(21);
  const [weeklySpend, setWeeklySpend] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // PIN change
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);

  // Recovery email
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Delete account
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.getMe().then((u) => {
      setUser(u);
      setAddiction(u.addiction || "");
      setGoalDays(u.goalDays || 21);
      setWeeklySpend(u.weeklySpend || "");
      setRecoveryEmail(u.recoveryEmail || "");
    }).catch((err) => setError(err.message));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSaved(false);
    try {
      await api.completeProfile({ addiction, goalDays: Number(goalDays), weeklySpend: Number(weeklySpend) || 0 });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePin(e) {
    e.preventDefault();
    setPinError("");
    if (!/^\d{4,6}$/.test(newPin)) return setPinError("New PIN must be 4-6 digits.");
    setPinSaving(true);
    try {
      await api.changePin(currentPin, newPin);
      setPinSaved(true);
      setCurrentPin("");
      setNewPin("");
      setTimeout(() => setPinSaved(false), 2000);
    } catch (err) {
      setPinError(err.message);
    } finally {
      setPinSaving(false);
    }
  }

  async function saveEmail(e) {
    e.preventDefault();
    setEmailError("");
    setEmailSaving(true);
    try {
      await api.setRecoveryEmail(recoveryEmail);
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 2000);
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailSaving(false);
    }
  }

  async function exportData() {
    try {
      const data = await api.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clearday-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await api.deleteMyAccount();
      onLoggedOut?.();
      navigate("/");
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (error) return <p className="max-w-md mx-auto px-4 py-12 text-red-500">{error}</p>;
  if (!user) return <p className="max-w-md mx-auto px-4 py-12 text-faint">Loading...</p>;

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5 pb-24">
      <BackBar fallback="/dashboard" />
      <h1 className="text-2xl font-bold text-ink">Settings</h1>

      <Section title="Your plan">
        <form onSubmit={saveProfile} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {ADDICTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAddiction(a.id)}
                className={`rounded-xl border py-2.5 text-xs font-medium transition ${
                  addiction === a.id ? "border-brand-600 bg-brand-50 text-brand-700" : "border-subtle text-muted"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-faint">Goal (days)</label>
            <div className="flex gap-2 mt-1">
              {[21, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setGoalDays(d)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    goalDays === d ? "border-brand-600 bg-brand-600 text-white" : "border-subtle text-muted"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-faint">Weekly spend (KES)</label>
            <input
              type="number"
              min="0"
              value={weeklySpend}
              onChange={(e) => setWeeklySpend(e.target.value)}
              className="w-full rounded-lg border border-subtle px-3 py-2 text-sm mt-1"
            />
          </div>
          <button
            type="submit"
            disabled={profileSaving}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {profileSaving ? "Saving..." : profileSaved ? "Saved ✓" : "Save changes"}
          </button>
          <p className="text-xs text-faint">Note: changing your addiction type or goal doesn't reset your streak.</p>
        </form>
      </Section>

      <Section title="Change PIN">
        <form onSubmit={savePin} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Current PIN"
            className="w-full rounded-lg border border-subtle px-3 py-2 text-sm tracking-widest text-center"
          />
          <input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="New PIN (4-6 digits)"
            className="w-full rounded-lg border border-subtle px-3 py-2 text-sm tracking-widest text-center"
          />
          {pinError && <p className="text-xs text-red-500">{pinError}</p>}
          <button
            type="submit"
            disabled={pinSaving}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {pinSaving ? "Saving..." : pinSaved ? "Updated ✓" : "Update PIN"}
          </button>
        </form>
      </Section>

      <Section title="Recovery email (optional)">
        <p className="text-xs text-faint mb-3">
          Add an email so you can reset your PIN yourself if you forget it. Without one, you'd
          need to contact support to regain access.
        </p>
        <form onSubmit={saveEmail} className="space-y-3">
          <input
            type="email"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-subtle px-3 py-2 text-sm"
          />
          {emailError && <p className="text-xs text-red-500">{emailError}</p>}
          <button
            type="submit"
            disabled={emailSaving}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {emailSaving ? "Saving..." : emailSaved ? "Saved ✓" : "Save email"}
          </button>
        </form>
      </Section>

      <Section title="Your data">
        <button
          onClick={exportData}
          className="w-full bg-subtlebg hover:bg-subtle text-ink font-semibold py-2.5 rounded-xl transition"
        >
          Export my data
        </button>
        <p className="text-xs text-faint mt-2">Downloads everything stored about you as a JSON file.</p>
      </Section>

      <div className="flex gap-4 justify-center text-xs">
        <Link to="/legal/terms" className="text-muted hover:text-ink underline">Terms of Service</Link>
        <Link to="/legal/privacy" className="text-muted hover:text-ink underline">Privacy Policy</Link>
      </div>

      <Section title="Danger zone">
        {deleteStep === 0 && (
          <button
            onClick={() => setDeleteStep(1)}
            className="w-full text-red-600 hover:bg-red-50 font-semibold py-2.5 rounded-xl transition border border-red-200"
          >
            Delete my account
          </button>
        )}
        {deleteStep === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-ink">
              This permanently deletes your account, streak, journal, and check-ins. This can't be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteStep(0)} className="flex-1 bg-subtlebg text-ink font-semibold py-2.5 rounded-xl">
                Cancel
              </button>
              <button onClick={() => setDeleteStep(2)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl">
                Continue
              </button>
            </div>
          </div>
        )}
        {deleteStep === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-red-600">Are you absolutely sure? This is your last chance to back out.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteStep(0)} className="flex-1 bg-subtlebg text-ink font-semibold py-2.5 rounded-xl">
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, delete everything"}
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
