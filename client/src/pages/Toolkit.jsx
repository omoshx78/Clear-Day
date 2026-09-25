import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const PHASES = [
  { label: "Breathe in", seconds: 4 },
  { label: "Hold", seconds: 4 },
  { label: "Breathe out", seconds: 6 },
];

export default function Toolkit() {
  const [user, setUser] = useState(null);
  const [quote, setQuote] = useState(null);
  const [active, setActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PHASES[0].seconds);
  const [rounds, setRounds] = useState(0);
  const [trigger, setTrigger] = useState("");
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    api.getMe().then(setUser).catch(() => {});
    // A fresh, random quote every time this screen is opened — this is the moment it matters most
    api.getRandomQuote().then(setQuote).catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        setPhaseIndex((idx) => {
          const next = (idx + 1) % PHASES.length;
          if (next === 0) setRounds((r) => r + 1);
          setSecondsLeft(PHASES[next].seconds);
          return next;
        });
        return PHASES[(phaseIndex + 1) % PHASES.length].seconds;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function start() {
    setActive(true);
    setPhaseIndex(0);
    setSecondsLeft(PHASES[0].seconds);
    setRounds(0);
  }

  function stop() {
    setActive(false);
    clearInterval(timerRef.current);
  }

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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
        <p className="text-sm font-semibold text-slate-700 mb-4">Guided breathing</p>

        {!active ? (
          <button
            onClick={start}
            className="w-40 h-40 mx-auto rounded-full bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center justify-center transition shadow-lg"
          >
            Start
          </button>
        ) : (
          <div className="space-y-3">
            <div
              className="w-40 h-40 mx-auto rounded-full bg-brand-100 border-4 border-brand-500 flex items-center justify-center transition-all duration-1000"
              style={{
                transform:
                  PHASES[phaseIndex].label === "Breathe in"
                    ? "scale(1.15)"
                    : PHASES[phaseIndex].label === "Breathe out"
                    ? "scale(0.85)"
                    : "scale(1)",
              }}
            >
              <div className="text-center">
                <p className="font-bold text-brand-700">{PHASES[phaseIndex].label}</p>
                <p className="text-3xl font-extrabold text-brand-700">{secondsLeft}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">Rounds completed: {rounds}</p>
            <button onClick={stop} className="text-sm text-slate-400 hover:text-red-500">
              Stop
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <p className="text-sm font-semibold text-slate-700 mb-2">What triggered this urge?</p>
        <textarea
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="e.g. stress after work, saw an ad, friends invited me out..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
