import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";

export default function Thread() {
  const { otherId } = useParams();
  const [messages, setMessages] = useState([]);
  const [otherProfile, setOtherProfile] = useState(null);
  const [text, setText] = useState("");
  const [meId, setMeId] = useState(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  async function load() {
    try {
      const [me, thread] = await Promise.all([api.getMe(), api.getThread(otherId)]);
      setMeId(me.id);
      setMessages(thread);
      try {
        const p = await api.getProvider(otherId);
        setOtherProfile(p);
      } catch {
        // other party isn't a public provider (e.g. this is a provider viewing a regular user) — fine
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [otherId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!text.trim()) return;
    setError("");
    try {
      await api.sendMessage(otherId, text);
      setText("");
      load();
    } catch (err) {
      if (err.message.includes("Pro")) setLocked(true);
      else setError(err.message);
    }
  }

  if (locked) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🔒</p>
        <h1 className="text-xl font-bold text-ink">Messaging support providers is a Pro feature</h1>
        <Link to="/upgrade" className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition">
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 flex flex-col" style={{ minHeight: "70vh" }}>
      <h1 className="text-lg font-bold text-ink mb-4">
        {otherProfile ? otherProfile.displayName : "Conversation"}
      </h1>

      <div className="flex-1 space-y-2 overflow-y-auto mb-4">
        {messages.length === 0 && <p className="text-sm text-faint text-center py-8">Say hello — this is a safe, private space.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.fromUserId === meId ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                m.fromUserId === meId ? "bg-brand-600 text-white" : "bg-surface border border-subtle text-ink"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-subtle px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={send}
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2 rounded-full text-sm transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
