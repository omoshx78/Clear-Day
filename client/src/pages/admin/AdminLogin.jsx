import React, { useState } from "react";
import { setAdminSecret, adminApi } from "../../adminApi.js";

export default function AdminLogin({ onLoggedIn }) {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAdminSecret(secret);
    try {
      await adminApi.getStats(); // validates the secret
      onLoggedIn();
    } catch (err) {
      setError("Incorrect admin secret.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-24">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">ClearDay Admin</h1>
      <p className="text-slate-500 text-sm mb-8">Owner-only. Enter your admin secret to continue.</p>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Admin secret"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {loading ? "Checking..." : "Enter dashboard"}
        </button>
      </form>
      <p className="text-xs text-slate-400 mt-6">
        This is the same value as your server's <code>ADMIN_SECRET</code> environment variable.
      </p>
    </div>
  );
}
