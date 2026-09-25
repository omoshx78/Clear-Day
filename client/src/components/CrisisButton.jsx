import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function CrisisButton() {
  const [open, setOpen] = useState(false);
  const [resources, setResources] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && resources.length === 0) {
      api.getCrisisResources().then(setResources).catch(() => setError("Could not load resources right now."));
    }
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-3 rounded-full shadow-lg transition"
        aria-label="Get urgent help"
      >
        Need help now?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-slate-800">You're not alone</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Free, confidential support is available right now — no cost, no judgment.
            </p>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="space-y-3">
              {resources.map((r) => (
                <a
                  key={r.name}
                  href={`tel:${r.tel}`}
                  className="block rounded-xl border border-slate-200 p-4 hover:border-brand-500 hover:bg-brand-50 transition"
                >
                  <p className="font-semibold text-slate-800">{r.name}</p>
                  <p className="text-brand-700 font-medium">{r.number}</p>
                  <p className="text-xs text-slate-500 mt-1">{r.description}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
