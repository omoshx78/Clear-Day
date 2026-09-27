import React from "react";
import SunriseIllustration from "./SunriseIllustration.jsx";

// Fills the empty gutters beside the centered app content on wide screens
// with a soft, non-interactive illustration — purely atmospheric, not ad
// space. Fixed-position so it doesn't affect page scroll/layout, hidden
// entirely below the lg breakpoint (this app is mobile-first; phone users
// never see this). The two sides mirror each other via CSS scaleX so we
// only draw the artwork once.
export default function SideDecoration() {
  return (
    <div className="hidden lg:block pointer-events-none fixed inset-y-0 left-0 right-0 -z-10" aria-hidden="true">
      <div className="absolute inset-y-0 left-0 w-[calc((100%-28rem)/2)] max-w-[260px] opacity-60">
        <SunriseIllustration className="w-full h-full" />
      </div>
      <div className="absolute inset-y-0 right-0 w-[calc((100%-28rem)/2)] max-w-[260px] opacity-60" style={{ transform: "scaleX(-1)" }}>
        <SunriseIllustration className="w-full h-full" />
      </div>
    </div>
  );
}
