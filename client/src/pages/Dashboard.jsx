import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import TreeVisual from "../components/TreeVisual.jsx";

const MILESTONES = [1, 3, 7, 14, 21, 30, 60, 90];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [quote, setQuote] = useState(null);
  const [hobbies, setHobbies] = useState([]);
  const [cravingLevel, setCravingLevel] = useState(3);
  const [note, setNote] = useState("");
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [u, c, q, h] = await Promise.all([
        api.getMe(),
        api.getCheckins(),
        api.getDailyQuote(), // refreshes each time the dashboard loads (e.g. every login), skipping the last one shown
        api.getHobbies(),
      ]);
      setUser(u);
      setCheckins(c);
      setQuote(q);
      setHobbies(h);
      const today = new Date().toDateString();
      setCheckedInToday(c.some((entry) => new Date(entry.date).toDateString() === today));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitCheckin() {
    await api.checkin({ cravingLevel, note });
    setNote("");
    load();
  }

  async function handleRelapse() {
    if (!confirm("Log a relapse and restart your streak from today? That's okay — it happens, and restarting counts as progress too.")) return;
    await api.relapse();
    load();
  }

  if (error) return <p className="max-w-md mx-auto px-4 py-12 text-red-500">{error}</p>;
  if (!user) return <p className="max-w-md mx-auto px-4 py-12 text-faint">Loading...</p>;

  const progress = Math.min(100, Math.round((user.streak / user.goalDays) * 100));

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      {quote && (
        <div className="rounded-2xl p-5 text-center text-white shadow-sm" style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}>
          <p className="text-sm italic leading-snug">&ldquo;{quote.text}&rdquo;</p>
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-6 text-center">
        <p className="text-sm font-medium text-faint uppercase tracking-wide">
          {user.preset?.label || user.addiction}-free streak
        </p>
        <p className="text-6xl font-extrabold text-brand-600 my-2">{user.streak}</p>
        <p className="text-muted text-sm">days — goal is {user.goalDays}</p>

        <div className="w-full h-2 bg-subtlebg rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {user.goalReached && (
          <p className="mt-3 text-brand-700 font-semibold">🎉 You reached your {user.goalDays}-day goal!</p>
        )}
      </div>

      <TreeVisual streak={user.streak} goalReached={user.goalReached} />

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-4 text-center">
          <p className="text-xs text-faint uppercase tracking-wide">Money saved</p>
          <p className="text-2xl font-bold text-ink mt-1">KES {user.moneySaved}</p>
        </div>
        <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-4 text-center">
          <p className="text-xs text-faint uppercase tracking-wide">Check-ins logged</p>
          <p className="text-2xl font-bold text-ink mt-1">{checkins.length}</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5">
        <p className="text-sm font-semibold text-ink mb-3">Milestones</p>
        <div className="flex flex-wrap gap-2">
          {MILESTONES.map((m) => (
            <span
              key={m}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                user.streak >= m
                  ? "bg-brand-100 text-brand-700"
                  : "bg-subtlebg text-faint"
              }`}
            >
              {m}d {user.streak >= m ? "✓" : ""}
            </span>
          ))}
        </div>
      </div>

      {hobbies.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5">
          <p className="text-sm font-semibold text-ink mb-1">Try this instead</p>
          <p className="text-xs text-faint mb-3">A few ideas to fill the space, refreshed weekly</p>
          <ul className="space-y-2">
            {hobbies.map((h, i) => (
              <li key={i} className="text-sm text-muted flex gap-2">
                <span className="text-brand-500">•</span>{h}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5">
        <p className="text-sm font-semibold text-ink mb-3">Today's check-in</p>
        {checkedInToday ? (
          <p className="text-sm text-brand-600">✓ You already checked in today. Nice work.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-faint">Craving level: {cravingLevel}/5</label>
              <input
                type="range"
                min="0"
                max="5"
                value={cravingLevel}
                onChange={(e) => setCravingLevel(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How are you feeling today? (optional)"
              className="w-full rounded-lg border border-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              rows={2}
            />
            <button
              onClick={submitCheckin}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition"
            >
              Log check-in
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleRelapse}
        className="w-full text-sm text-faint hover:text-red-500 transition py-2"
      >
        I slipped up — restart my streak
      </button>
    </div>
  );
}
