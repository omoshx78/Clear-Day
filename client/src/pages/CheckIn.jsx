import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import BreathingExercise from "../components/BreathingExercise.jsx";

const MOODS = [
  { id: "struggling", label: "Struggling", color: "#3b82f6" },
  { id: "low", label: "Low", color: "#06b6d4" },
  { id: "okay", label: "Okay", color: "#a855f7" },
  { id: "good", label: "Good", color: "#f97316" },
  { id: "great", label: "Great", color: "#eab308" },
];

const STEPS = ["mood", "craving", "breathing", "coping"];

export default function CheckIn() {
  const [stepIndex, setStepIndex] = useState(0);
  const [mood, setMood] = useState(null);
  const [cravingLevel, setCravingLevel] = useState(3);
  const [note, setNote] = useState("");
  const [hobbies, setHobbies] = useState([]);
  const [quote, setQuote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.getHobbies().then(setHobbies).catch(() => {});
    api.getRandomQuote().then(setQuote).catch(() => {});
  }, []);

  function next() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function selectMood(id) {
    setMood(id);
    setTimeout(next, 250); // brief pause so the selection is visible before advancing
  }

  async function finish() {
    setSaving(true);
    setError("");
    try {
      await api.checkin({ mood, cravingLevel, note });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const step = STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="w-full h-1.5 bg-subtlebg rounded-full overflow-hidden">
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {step === "mood" && (
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold text-ink">How are you feeling today?</h1>
          <div className="flex justify-center gap-3 flex-wrap">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => selectMood(m.id)}
                className="flex flex-col items-center gap-2 group"
              >
                <span
                  className="w-14 h-14 rounded-full flex items-center justify-center border-2 transition"
                  style={{
                    borderColor: m.color,
                    background: mood === m.id ? m.color : "transparent",
                  }}
                >
                  <span
                    className="w-6 h-6 rounded-full"
                    style={{ background: mood === m.id ? "#fff" : m.color, opacity: mood === m.id ? 1 : 0.85 }}
                  />
                </span>
                <span className="text-xs text-muted group-hover:text-ink">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "craving" && (
        <div className="space-y-5">
          <h1 className="text-2xl font-bold text-ink text-center">Any cravings right now?</h1>
          <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5">
            <label className="text-xs text-muted">Craving level: {cravingLevel}/5</label>
            <input
              type="range"
              min="0"
              max="5"
              value={cravingLevel}
              onChange={(e) => setCravingLevel(Number(e.target.value))}
              className="w-full"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything on your mind? (optional)"
              className="w-full rounded-lg border border-subtle px-3 py-2 text-sm mt-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
              rows={2}
            />
          </div>
          <button onClick={next} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition">
            Continue
          </button>
        </div>
      )}

      {step === "breathing" && (
        <div className="space-y-5">
          <h1 className="text-2xl font-bold text-ink text-center">Take a moment to breathe</h1>
          <BreathingExercise onComplete={next} />
        </div>
      )}

      {step === "coping" && (
        <div className="space-y-5 text-center">
          <h1 className="text-2xl font-bold text-ink">You're done for today</h1>
          {quote && (
            <div className="rounded-2xl p-5 text-white shadow-sm" style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}>
              <p className="text-sm italic leading-snug">&ldquo;{quote.text}&rdquo;</p>
            </div>
          )}
          {hobbies.length > 0 && (
            <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5 text-left">
              <p className="text-sm font-semibold text-ink mb-1">Something to try today</p>
              <ul className="space-y-2 mt-2">
                {hobbies.map((h, i) => (
                  <li key={i} className="text-sm text-muted flex gap-2">
                    <span className="text-brand-500">•</span>{h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={finish}
            disabled={saving}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Finish check-in"}
          </button>
        </div>
      )}
    </div>
  );
}
