import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState("");

  function load() {
    api.getJournal().then(setEntries).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function addEntry() {
    if (!text.trim()) return;
    await api.addJournal({ text });
    setText("");
    load();
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5">
        <p className="text-sm font-semibold text-ink mb-2">New entry</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write about your day, how you're feeling, or a win worth remembering..."
          className="w-full rounded-lg border border-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          rows={3}
        />
        <button
          onClick={addEntry}
          className="mt-3 w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition"
        >
          Save entry
        </button>
      </div>

      <div className="space-y-3">
        {entries.length === 0 && (
          <p className="text-sm text-faint text-center">No journal entries yet.</p>
        )}
        {entries.map((e) => (
          <div key={e.id} className="bg-surface rounded-2xl shadow-sm border border-subtle p-4">
            <p className="text-xs text-faint mb-1">
              {new Date(e.date).toLocaleString()}
            </p>
            <p className="text-sm text-ink whitespace-pre-wrap">{e.text}</p>
            {e.trigger && (
              <p className="text-xs text-brand-600 mt-2">Trigger: {e.trigger}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
