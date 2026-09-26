import React, { useState } from "react";
import { api } from "../api.js";
import BackBar from "../components/BackBar.jsx";

const CATEGORIES = [
  { id: "help", label: "I need help", emoji: "🆘" },
  { id: "suggestion", label: "Suggestion", emoji: "💡" },
  { id: "compliment", label: "Compliment", emoji: "💚" },
  { id: "complaint", label: "Complaint", emoji: "⚠️" },
];

export default function Contact() {
  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!category) return setError("Please choose what this is about.");
    if (!message.trim()) return setError("Please write a message.");
    setLoading(true);
    setError("");
    try {
      await api.sendFeedback(category, message);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <>
        <BackBar />
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
          <p className="text-4xl">✅</p>
          <h1 className="text-xl font-bold text-ink">Thank you</h1>
          <p className="text-muted text-sm">The ClearDay team will read this. We appreciate you taking the time.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <BackBar />
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-ink mb-1">Contact the ClearDay team</h1>
        <p className="text-muted text-sm mb-6">
          Suggestions, compliments, complaints, or general help — we read every message.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">What's this about?</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-2 rounded-xl border py-3 px-3 text-sm font-medium transition ${
                    category === c.id
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-subtle text-muted hover:border-brand-300"
                  }`}
                >
                  <span>{c.emoji}</span>{c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Your message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Tell us what's on your mind..."
              className="w-full rounded-lg border border-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send message"}
          </button>
        </form>
      </div>
    </>
  );
}
