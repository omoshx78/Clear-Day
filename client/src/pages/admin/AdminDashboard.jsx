import React, { useEffect, useState } from "react";
import { adminApi, clearAdminSecret } from "../../adminApi.js";

const ADDICTION_LABELS = { smoking: "Smoking", alcohol: "Alcohol", gambling: "Gambling / Betting" };

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard({ onLogout }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [pendingInstitutions, setPendingInstitutions] = useState([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  async function loadAll() {
    try {
      const [s, p, i] = await Promise.all([
        adminApi.getStats(),
        adminApi.getPendingProviders(),
        adminApi.getPendingInstitutions(),
      ]);
      setStats(s);
      setPendingProviders(p);
      setPendingInstitutions(i);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (tab === "users" && !users) adminApi.getUsers().then(setUsers).catch((err) => setError(err.message)); }, [tab]);

  async function approveProvider(id) { await adminApi.verifyProvider(id); loadAll(); }
  async function rejectProvider(id) { await adminApi.rejectProvider(id); loadAll(); }
  async function approveInstitution(id) { await adminApi.verifyInstitution(id); loadAll(); }

  if (error) return <p className="max-w-2xl mx-auto px-4 py-12 text-red-500">{error}</p>;
  if (!stats) return <p className="max-w-2xl mx-auto px-4 py-12 text-slate-400">Loading...</p>;

  const maxSignup = Math.max(1, ...stats.signupsByDay.map((d) => d.count));
  const pendingCount = pendingProviders.length + pendingInstitutions.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ClearDay Admin</h1>
        <button onClick={onLogout} className="text-sm text-slate-400 hover:text-red-500">Log out</button>
      </div>

      <div className="flex gap-1 mb-6">
        {[["overview", "Overview"], ["review", `Review${pendingCount ? ` (${pendingCount})` : ""}`], ["users", "Users"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${tab === id ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {stats.daraja.mockMode && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              M-Pesa is running in mock mode — revenue figures below are simulated, not real transactions.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Total users" value={stats.totalUsers} sub={`${stats.onboardedUsers} onboarded`} />
            <StatCard label="Active (24h)" value={stats.activeLast24h} sub={`${stats.activeLast7d} in last 7 days`} />
            <StatCard label="Pro subscribers" value={stats.proSubscribers} />
            <StatCard label="Est. monthly revenue" value={`KES ${stats.estimatedMonthlyRevenueKes}`} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm font-semibold text-slate-700 mb-4">Signups, last 7 days</p>
            <div className="flex items-end justify-between gap-2 h-24">
              {stats.signupsByDay.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-brand-500 rounded-t-md transition-all"
                    style={{ height: `${(d.count / maxSignup) * 100}%`, minHeight: d.count > 0 ? "4px" : "0", background: "#0d9488" }}
                  />
                  <span className="text-[10px] text-slate-400">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">By addiction</p>
              {Object.entries(stats.byAddiction).map(([a, c]) => (
                <div key={a} className="flex justify-between text-sm py-0.5">
                  <span className="text-slate-600">{ADDICTION_LABELS[a] || a}</span>
                  <span className="font-semibold text-slate-800">{c}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Engagement</p>
              <div className="flex justify-between text-sm py-0.5"><span className="text-slate-600">Check-ins</span><span className="font-semibold text-slate-800">{stats.totalCheckins}</span></div>
              <div className="flex justify-between text-sm py-0.5"><span className="text-slate-600">Journal entries</span><span className="font-semibold text-slate-800">{stats.totalJournalEntries}</span></div>
              <div className="flex justify-between text-sm py-0.5"><span className="text-slate-600">Messages sent</span><span className="font-semibold text-slate-800">{stats.totalMessages}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Support providers</p>
              <div className="flex justify-between text-sm py-0.5"><span className="text-slate-600">Verified</span><span className="font-semibold text-slate-800">{stats.providerCounts.verified}</span></div>
              <div className="flex justify-between text-sm py-0.5"><span className="text-slate-600">Pending</span><span className="font-semibold text-amber-600">{stats.providerCounts.pending}</span></div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Institutions</p>
              <div className="flex justify-between text-sm py-0.5"><span className="text-slate-600">Verified</span><span className="font-semibold text-slate-800">{stats.institutionCounts.verified}</span></div>
              <div className="flex justify-between text-sm py-0.5"><span className="text-slate-600">Pending</span><span className="font-semibold text-amber-600">{stats.institutionCounts.pending}</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === "review" && (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Pending provider applications</p>
            {pendingProviders.length === 0 && <p className="text-sm text-slate-400">Nothing pending.</p>}
            <div className="space-y-3">
              {pendingProviders.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                  <p className="font-semibold text-slate-800">{p.displayName} <span className="text-xs font-normal text-slate-400">· {p.phone}</span></p>
                  <p className="text-xs text-brand-600 font-medium mt-0.5">{p.specialty}</p>
                  <p className="text-sm text-slate-600 mt-2">{p.bio}</p>
                  {p.credentials && <p className="text-xs text-slate-400 mt-1">Credentials: {p.credentials}</p>}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => approveProvider(p.id)} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2 rounded-lg transition">Approve</button>
                    <button onClick={() => rejectProvider(p.id)} className="flex-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-sm font-semibold py-2 rounded-lg transition">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Pending institution applications</p>
            {pendingInstitutions.length === 0 && <p className="text-sm text-slate-400">Nothing pending.</p>}
            <div className="space-y-3">
              {pendingInstitutions.map((inst) => (
                <div key={inst.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                  <p className="font-semibold text-slate-800">{inst.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{inst.type} {inst.contactPhone && `· ${inst.contactPhone}`}</p>
                  <button onClick={() => approveInstitution(inst.id)} className="mt-3 w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2 rounded-lg transition">Approve</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {!users ? (
            <p className="text-sm text-slate-400 p-4">Loading...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Phone</th>
                  <th className="text-left px-4 py-2">Addiction</th>
                  <th className="text-left px-4 py-2">Streak</th>
                  <th className="text-left px-4 py-2">Pro</th>
                  <th className="text-left px-4 py-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{u.phone}</td>
                    <td className="px-4 py-2">{ADDICTION_LABELS[u.addiction] || "—"}</td>
                    <td className="px-4 py-2">{u.streak ?? "—"}</td>
                    <td className="px-4 py-2">{u.isPro ? "★" : ""}</td>
                    <td className="px-4 py-2 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
