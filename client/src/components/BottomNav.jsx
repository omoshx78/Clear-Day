import React from "react";
import { Link, useLocation } from "react-router-dom";

const ICONS = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l9-9 9 9" /><path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
    </svg>
  ),
  toolkit: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 3" />
    </svg>
  ),
  journal: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h13a2 2 0 012 2v14l-3-2-3 2-3-2-3 2-3-2-2 2V6a2 2 0 012-2z" />
    </svg>
  ),
  resources: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21C12 21 4 15.5 4 9.5A4.5 4.5 0 0112 6a4.5 4.5 0 018 3.5C20 15.5 12 21 12 21z" />
    </svg>
  ),
  plus: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

const ITEMS = [
  { to: "/dashboard", icon: "home", label: "Home" },
  { to: "/toolkit", icon: "toolkit", label: "Toolkit" },
  { to: "/checkin", icon: "plus", label: "Check in", raised: true },
  { to: "/journal", icon: "journal", label: "Journal" },
  { to: "/resources", icon: "resources", label: "Resources" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-surface border-t border-subtle">
      <div className="max-w-md mx-auto grid grid-cols-5 items-end px-2 pb-2 pt-2">
        {ITEMS.map((item) => {
          const active = location.pathname === item.to;
          if (item.raised) {
            return (
              <Link key={item.to} to={item.to} className="flex flex-col items-center -mt-6">
                <span className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg">
                  {ICONS[item.icon]}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 py-1 transition ${active ? "text-brand-600" : "text-faint"}`}
            >
              {ICONS[item.icon]}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
