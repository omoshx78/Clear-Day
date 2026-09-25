import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const ICONS = { smoking: "🚬", alcohol: "🍷", gambling: "🎲" };

export default function Onboarding({ onProfileComplete }) {
  const [presets, setPresets] = useState([]);
  const [addiction, setAddiction] = useState(null);
  const [weeklySpend, setWeeklySpend] = useState("");
  const [goalDays, setGoalDays] = useState(21);
  const [alreadyQuitDays, setAlreadyQuitDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getPresets().then(setPresets).catch(() => {
      setPresets([
        { id: "smoking", label: "Smoking" },
        { id: "alcohol", label: "Alcohol" },
        { id: "gambling", label: "Gambling / Betting" },
      ]);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!addiction) return setError("Please choose what you're quitting.");
    setLoading(true);
    setError("");
    try {
      const quitDate = new Date();
      quitDate.setDate(quitDate.getDate() - Number(alreadyQuitDays || 0));
      await api.completeProfile({
        addiction,
        weeklySpend: Number(weeklySpend) || 0,
        goalDays: Number(goalDays) || 21,
        quitDate: quitDate.toISOString(),
      });
      onProfileComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-800 mb-1">Start your journey</h1>
      <p className="text-slate-500 mb-8">A few quick questions to set up your plan.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            What are you quitting?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setAddiction(p.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-4 text-sm font-medium transition ${
                  addiction === p.id
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className="text-2xl">{ICONS[p.id] || "✳️"}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Goal (days)
          </label>
          <div className="flex gap-2">
            {[21, 30, 60, 90].map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setGoalDays(d)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                  goalDays === d
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Already clean for a few days? (optional)
          </label>
          <input
            type="number"
            min="0"
            value={alreadyQuitDays}
            onChange={(e) => setAlreadyQuitDays(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Roughly how much do you spend weekly on this? (optional)
          </label>
          <input
            type="number"
            min="0"
            value={weeklySpend}
            onChange={(e) => setWeeklySpend(e.target.value)}
            placeholder="e.g. 1000"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-slate-400 mt-1">Used to show you money saved as you progress (KES).</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {loading ? "Setting up..." : "Begin my journey"}
        </button>
      </form>
    </div>
  );
}
