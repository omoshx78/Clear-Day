import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function JoinInstitution() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    if (!code.trim()) return setError("Enter an invite code.");
    setLoading(true);
    setError("");
    try {
      const res = await api.joinInstitution(code.trim());
      setDone(res.institutionName);
      setTimeout(() => navigate("/support"), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-4xl">🤝</p>
        <h1 className="text-xl font-bold text-ink">You've joined {done}</h1>
        <p className="text-muted text-sm">Your progress now contributes to their aggregated, anonymized stats.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-ink mb-1">Join an institution</h1>
      <p className="text-muted text-sm mb-6">
        Enter the invite code from your church, mosque, employer, or recovery center.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. IKMUKSJZ"
          className="w-full rounded-lg border border-subtle px-3 py-2.5 tracking-widest text-center text-lg"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {loading ? "Joining..." : "Join"}
        </button>
      </form>
    </div>
  );
}
