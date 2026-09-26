import React from "react";
import { useNavigate, Link } from "react-router-dom";

export default function BackBar({ fallback = "/dashboard", label = "Back" }) {
  const navigate = useNavigate();

  function goBack() {
    // If there's real history to go back to (came from within the app),
    // use it — otherwise (e.g. landed here directly via a refresh or a
    // shared link) fall back to a known-safe destination.
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-4 flex items-center justify-between">
      <button
        onClick={goBack}
        className="flex items-center gap-1 text-sm font-medium text-muted hover:text-ink transition"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {label}
      </button>
      <Link
        to="/dashboard"
        className="flex items-center gap-1 text-sm font-medium text-muted hover:text-ink transition"
        aria-label="Go to Dashboard"
        title="Dashboard"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12l9-9 9 9" /><path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
        </svg>
        Home
      </Link>
    </div>
  );
}
