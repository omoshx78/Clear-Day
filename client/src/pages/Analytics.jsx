import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch((err) => {
        if (err.message.includes("Pro")) setLocked(true);
        else setError(err.message);
      });
  }, []);

  if (locked) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🔒</p>
        <h1 className="text-xl font-bold text-slate-800">Advanced analytics is a Pro feature</h1>
        <p className="text-slate-500 text-sm">
          See your craving patterns by day of the week, and more, with ClearDay Pro.
        </p>
        <Link
          to="/upgrade"
          className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition"
        >
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  if (error) return <p className="max-w-md mx-auto px-4 py-12 text-red-500">{error}</p>;
  if (!data) return <p className="max-w-md mx-auto px-4 py-12 text-slate-400">Loading...</p>;

  const maxAvg = Math.max(1, ...data.cravingByDay.map((d) => d.avgCraving));

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Your craving patterns</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total check-ins</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{data.totalCheckins}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Avg craving</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{data.avgCravingOverall}/5</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">Average craving by day of week</p>
        <div className="flex items-end justify-between gap-2 h-32">
          {data.cravingByDay.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-brand-500 rounded-t-md transition-all"
                style={{ height: `${(d.avgCraving / maxAvg) * 100}%`, minHeight: d.avgCraving > 0 ? "4px" : "0" }}
              />
              <span className="text-xs text-slate-400">{d.day}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Higher bars mean tougher days for cravings — worth planning around.
        </p>
      </div>
    </div>
  );
}
