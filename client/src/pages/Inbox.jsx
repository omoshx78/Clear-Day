import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Inbox() {
  const [conversations, setConversations] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getMyConversations().then(setConversations).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="max-w-md mx-auto px-4 py-12 text-red-500">{error}</p>;
  if (!conversations) return <p className="max-w-md mx-auto px-4 py-12 text-slate-400">Loading...</p>;

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-3">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Your inbox</h1>
      {conversations.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No messages yet. People you support will appear here.</p>
      )}
      {conversations.map((c) => (
        <Link
          key={c.userId}
          to={`/support/thread/${c.userId}`}
          className="block bg-white rounded-2xl shadow-sm border border-slate-100 p-4 hover:border-brand-300 transition"
        >
          <p className="text-sm text-slate-700 truncate">{c.lastMessage}</p>
          <p className="text-xs text-slate-400 mt-1">{new Date(c.lastDate).toLocaleString()}</p>
        </Link>
      ))}
    </div>
  );
}
