import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function ProviderDirectory() {
  const [specialties, setSpecialties] = useState([]);
  const [specialty, setSpecialty] = useState("");
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getProviderSpecialties().then(setSpecialties).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getProviders(specialty).then(setProviders).finally(() => setLoading(false));
  }, [specialty]);

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold text-ink">Find a support provider</h1>

      <select
        value={specialty}
        onChange={(e) => setSpecialty(e.target.value)}
        className="w-full rounded-lg border border-subtle px-3 py-2 text-sm"
      >
        <option value="">All specialties</option>
        {specialties.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {loading && <p className="text-faint text-sm">Loading...</p>}
      {!loading && providers.length === 0 && (
        <p className="text-faint text-sm text-center py-8">No verified providers yet for this specialty.</p>
      )}

      <div className="space-y-3">
        {providers.map((p) => (
          <div key={p.id} className="bg-surface rounded-2xl shadow-sm border border-subtle p-5">
            <p className="font-semibold text-ink">{p.displayName}</p>
            <p className="text-xs text-brand-600 font-medium mt-0.5">{p.specialty}</p>
            <p className="text-sm text-muted mt-2">{p.bio}</p>
            <button
              onClick={() => navigate(`/support/thread/${p.id}`)}
              className="mt-3 w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 rounded-xl text-sm transition"
            >
              Message
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
