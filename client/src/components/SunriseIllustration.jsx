import React from "react";

// A calm, flat illustration in the app's brand palette — sun rising behind
// layered hills, matching the logo's sunrise motif. Built as SVG (not a
// photo) deliberately: no licensing risk, no external dependency, and it's
// fully ours to adjust. viewBox is fixed and preserveAspectRatio="slice"
// crops to fill whatever container size it's given, so the same artwork
// works as a tall side-gutter strip or a short hero band without needing
// separate variants.
//
// To later mix in a real photo here instead: replace the returned <svg>
// with an <img src="..." className="w-full h-full object-cover" /> — the
// parent containers (SideDecoration.jsx, Login.jsx) already size this
// component via CSS, so nothing else needs to change.
export default function SunriseIllustration({ className = "" }) {
  return (
    <svg
      viewBox="0 0 400 600"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Sunrise over hills"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e1f5ee" />
          <stop offset="65%" stopColor="#eefaf5" />
          <stop offset="100%" stopColor="#fef3e2" />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="400" height="600" fill="url(#sky)" />

      {/* Soft clouds */}
      <ellipse cx="90" cy="110" rx="42" ry="14" fill="#ffffff" opacity="0.55" />
      <ellipse cx="130" cy="100" rx="30" ry="11" fill="#ffffff" opacity="0.45" />
      <ellipse cx="310" cy="160" rx="36" ry="12" fill="#ffffff" opacity="0.4" />

      {/* Small birds */}
      <path d="M60,80 Q65,72 70,80 Q75,72 80,80" stroke="#0f766e" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M100,60 Q104,54 108,60 Q112,54 116,60" stroke="#0f766e" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4" />

      {/* Sun with soft rays, partly occluded by the hills below */}
      <g opacity="0.9">
        <line x1="200" y1="330" x2="200" y2="290" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
        <line x1="150" y1="345" x2="118" y2="320" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
        <line x1="250" y1="345" x2="282" y2="320" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
        <line x1="120" y1="390" x2="80" y2="390" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
        <line x1="280" y1="390" x2="320" y2="390" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
        <circle cx="200" cy="420" r="65" fill="url(#sun)" />
      </g>

      {/* Layered hills, back to front */}
      <path
        d="M0,410 C100,380 150,420 200,395 C250,370 320,410 400,390 L400,600 L0,600 Z"
        fill="#ccfbf1"
      />
      <path
        d="M0,470 C90,430 160,480 220,450 C290,420 340,470 400,440 L400,600 L0,600 Z"
        fill="#2dd4bf"
        opacity="0.9"
      />
      <path
        d="M0,540 C100,500 180,545 250,515 C310,490 360,530 400,510 L400,600 L0,600 Z"
        fill="#0f766e"
      />
    </svg>
  );
}
