import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api.js";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/toolkit", label: "Craving Toolkit" },
  { to: "/journal", label: "Journal" },
  { to: "/analytics", label: "Analytics" },
  { to: "/support", label: "Support" },
];

export default function NavBar({ onLogout }) {
  const location = useLocation();
  const [isPro, setIsPro] = useState(null);

  useEffect(() => {
    api.getProStatus().then((s) => setIsPro(s.isPro)).catch(() => {});
  }, [location.pathname]);

  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3 flex-wrap gap-y-2">
        <span className="font-bold text-brand-700 text-lg">ClearDay</span>
        <nav className="flex gap-1 items-center flex-wrap">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                location.pathname === l.to
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}

          {isPro ? (
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              ★ PRO
            </span>
          ) : (
            <Link
              to="/upgrade"
              className="px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition"
            >
              Go Pro
            </Link>
          )}

          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-full text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
            title="Log out"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
