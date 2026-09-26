import React from "react";

export default function Logo({ size = 32, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="ClearDay logo"
    >
      <defs>
        <linearGradient id="clearday-logo-gradient" x1="0" y1="0" x2="0" y2="200">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="200" rx="44" fill="url(#clearday-logo-gradient)" />
      <line x1="100" y1="90" x2="100" y2="74" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
      <line x1="78" y1="98" x2="66" y2="84" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
      <line x1="122" y1="98" x2="134" y2="84" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
      <line x1="62" y1="112" x2="46" y2="104" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
      <line x1="138" y1="112" x2="154" y2="104" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
      <path d="M66,130 A34,34 0 0 1 134,130 Z" fill="#ffffff" />
      <rect x="40" y="128" width="120" height="9" rx="4.5" fill="#ffffff" />
    </svg>
  );
}
