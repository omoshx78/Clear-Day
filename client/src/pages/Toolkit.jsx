import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import BreathingExercise from "../components/BreathingExercise.jsx";

export default function Toolkit() {
  const [user, setUser] = useState(null);
  const [quote, setQuote] = useState(null);
  const [trigger, setTrigger] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getMe().then(setUser).catch(() => {});
    // A fresh, random quote every time this screen is opened — this is the moment it matters most
    api.getRandomQuote().then(setQuote).catch(() => {});
  }, []);

  async function logUrge() {
    if (!trigger.trim()) return;
    await api.addJournal({ text: `Survived an urge. ${trigger}`, trigger });
    setTrigger("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const prompt = quote?.text || user?.preset?.breathingPrompt || "You've got this. Take a breath and let the urge pass.";

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-2xl p-6 text-center shadow-md">
        <p className="text-sm uppercase tracking-wide opacity-80">Panic Button</p>
        <p className="mt-2 font-medium leading-snug">{prompt}</p>
      </div>

      <BreathingExercise />

      <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5">
        <p className="text-sm font-semibold text-ink mb-2">What triggered this urge?</p>
        <textarea
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="e.g. stress after work, saw an ad, friends invited me out..."
          className="w-full rounded-lg border border-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          rows={2}
        />
        <button
          onClick={logUrge}
          className="mt-3 w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-xl transition"
        >
          I got through it — log this urge
        </button>
        {saved && <p className="text-sm text-brand-600 mt-2">Saved to your journal. Proud of you.</p>}
      </div>
    </div>
  );
}
