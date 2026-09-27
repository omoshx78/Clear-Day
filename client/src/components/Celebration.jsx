import React, { useEffect, useState } from "react";

// A brief, calm confetti burst for milestone moments — deliberately
// restrained (brand colors only, ~2 seconds, no sound) rather than a
// flashy game-like effect, since this is a recovery app, not a game.
// Pure CSS animation, no new dependency (same philosophy as the
// hand-drawn canvas share card — nothing pulled in just for this).
const COLORS = ["#0d9488", "#2dd4bf", "#fbbf24", "#f59e0b"];
const PIECES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 0.3,
  duration: 1.6 + Math.random() * 0.8,
  color: COLORS[i % COLORS.length],
  rotate: Math.random() * 360,
  drift: (Math.random() - 0.5) * 120,
}));

export default function Celebration({ onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {PIECES.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: "-5%",
            left: `${p.left}%`,
            width: 8,
            height: 8,
            background: p.color,
            borderRadius: 2,
            animation: `celebration-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            "--drift": `${p.drift}px`,
            "--rotate": `${p.rotate}deg`,
          }}
        />
      ))}
      <style>{`
        @keyframes celebration-fall {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--drift), 110vh) rotate(var(--rotate)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
