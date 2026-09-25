import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function ProviderApply() {
  const [specialties, setSpecialties] = useState([]);
  const [displayName, setDisplayName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [credentials, setCredentials] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getProviderSpecialties().then(setSpecialties).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!displayName || !specialty || !bio) return setError("Please fill in your name, specialty, and a short bio.");
    setLoading(true);
    setError("");
    try {
      await api.applyAsProvider({ displayName, specialty, bio, credentials });
      setDone(true);
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
        <p className="text-4xl">✅</p>
        <h1 className="text-xl font-bold text-ink">Application submitted</h1>
        <p className="text-muted text-sm">We'll review it and get back to you.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-ink mb-1">Become a support provider</h1>
      <p className="text-muted text-sm mb-6">For counselors, chaplains, pastors, imams, and peer-recovery coaches.</p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-1">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Grace M."
            className="w-full rounded-lg border border-subtle px-3 py-2 text-sm"
          />
          <p className="text-xs text-faint mt-1">Shown publicly — doesn't have to be your full legal name.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-1">Specialty</label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full rounded-lg border border-subtle px-3 py-2 text-sm"
          >
            <option value="">Select one</option>
            {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-1">Short bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="A sentence or two about your background and approach"
            className="w-full rounded-lg border border-subtle px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-1">Credentials (optional)</label>
          <input
            value={credentials}
            onChange={(e) => setCredentials(e.target.value)}
            placeholder="e.g. licensed counselor, ordained pastor"
            className="w-full rounded-lg border border-subtle px-3 py-2 text-sm"
          />
          <p className="text-xs text-faint mt-1">Only visible to our review team, not shown publicly.</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit application"}
        </button>
      </form>
    </div>
  );
}
