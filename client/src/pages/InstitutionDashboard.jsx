import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const ADDICTION_LABELS = { smoking: "Smoking", alcohol: "Alcohol", gambling: "Gambling / Betting" };

export default function InstitutionDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getInstitutionDashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  function copyCode() {
    navigator.clipboard?.writeText(data.institution.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (error) return <p className="max-w-md mx-auto px-4 py-12 text-red-500">{error}</p>;
  if (!data) return <p className="max-w-md mx-auto px-4 py-12 text-faint">Loading...</p>;

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{data.institution.name}</h1>
        <p className="text-sm text-muted">Aggregated, anonymized member progress</p>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5">
        <p className="text-sm font-semibold text-ink mb-2">Invite code</p>
        <div className="flex items-center gap-2">
          <span className="flex-1 text-center text-lg font-bold tracking-widest bg-subtlebg rounded-lg py-2">
            {data.institution.inviteCode}
          </span>
          <button
            onClick={copyCode}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-faint mt-2">Share this with your members so they can join your cohort.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-4 text-center">
          <p className="text-xs text-faint uppercase tracking-wide">Members</p>
          <p className="text-2xl font-bold text-ink mt-1">{data.memberCount}</p>
        </div>
        <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-4 text-center">
          <p className="text-xs text-faint uppercase tracking-wide">Avg streak (days)</p>
          <p className="text-2xl font-bold text-ink mt-1">{data.avgStreak}</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5">
        <p className="text-sm font-semibold text-ink mb-1">Reached their goal</p>
        <p className="text-2xl font-bold text-brand-600">{data.goalReachedCount} <span className="text-sm text-faint font-normal">of {data.memberCount}</span></p>
      </div>

      {Object.keys(data.byAddiction).length > 0 && (
        <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5">
          <p className="text-sm font-semibold text-ink mb-3">By addiction type</p>
          <div className="space-y-2">
            {Object.entries(data.byAddiction).map(([addiction, count]) => (
              <div key={addiction} className="flex justify-between text-sm">
                <span className="text-muted">{ADDICTION_LABELS[addiction] || addiction}</span>
                <span className="font-semibold text-ink">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-faint text-center">
        Individual journal entries and messages are always private — this dashboard only ever shows aggregated numbers.
      </p>
    </div>
  );
}
