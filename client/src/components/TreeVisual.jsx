import React, { useState } from "react";

// Deterministic pseudo-random placement so the same streak always renders
// the same tree shape (no jitter between re-renders)
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function TreeVisual({ streak, goalReached }) {
  const [watered, setWatered] = useState(false);
  const [drops, setDrops] = useState([]);

  const growth = Math.min(streak, 60) / 60; // 0..1 growth factor, caps visual growth at 60 days
  const trunkHeight = 20 + growth * 70;
  const canopyRadius = 10 + growth * 50;
  const leafCount = Math.min(streak, 45);

  const rand = seededRandom(streak + 1);
  const leaves = Array.from({ length: leafCount }, (_, i) => {
    const angle = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * canopyRadius;
    return {
      x: 100 + Math.cos(angle) * r,
      y: (140 - trunkHeight) + Math.sin(angle) * r * 0.7,
      size: 3 + rand() * 3,
      hue: 140 + rand() * 30,
    };
  });

  const fruitCount = goalReached ? Math.min(8, Math.floor(streak / 10)) : 0;
  const fruits = Array.from({ length: fruitCount }, (_, i) => {
    const angle = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * canopyRadius * 0.8;
    return { x: 100 + Math.cos(angle) * r, y: (140 - trunkHeight) + Math.sin(angle) * r * 0.7 };
  });

  function handleWater() {
    if (watered) return;
    setWatered(true);
    setDrops(Array.from({ length: 5 }, (_, i) => ({ id: i, delay: i * 0.15, x: 80 + i * 10 })));
    setTimeout(() => setDrops([]), 1500);
  }

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-5 text-center">
      <p className="text-sm font-semibold text-ink">Your tree</p>
      <p className="text-xs text-faint mb-2">Grows a little every clean day</p>

      <svg viewBox="0 0 200 150" className="w-full max-w-[220px] mx-auto" style={{ overflow: "visible" }}>
        {/* ground */}
        <ellipse cx="100" cy="142" rx="55" ry="6" fill="#e7e0d3" />

        {streak === 0 ? (
          <circle cx="100" cy="136" r="4" fill="#8b5e34" />
        ) : (
          <>
            {/* trunk */}
            <rect
              x={98 - growth * 2}
              y={140 - trunkHeight}
              width={4 + growth * 4}
              height={trunkHeight}
              rx="2"
              fill="#8b5e34"
            />
            {/* leaves */}
            {leaves.map((l, i) => (
              <circle key={i} cx={l.x} cy={l.y} r={l.size} fill={`hsl(${l.hue}, 55%, 45%)`} opacity="0.9" />
            ))}
            {/* fruits for goal reached */}
            {fruits.map((f, i) => (
              <circle key={i} cx={f.x} cy={f.y} r="3.5" fill="#f59e0b" />
            ))}
          </>
        )}

        {/* water droplets animation */}
        {drops.map((d) => (
          <circle key={d.id} cx={d.x} cy="10" r="2.5" fill="#38bdf8">
            <animate attributeName="cy" from="10" to="130" dur="0.8s" begin={`${d.delay}s`} fill="freeze" />
            <animate attributeName="opacity" from="1" to="0" dur="0.8s" begin={`${d.delay}s`} fill="freeze" />
          </circle>
        ))}
      </svg>

      <button
        onClick={handleWater}
        disabled={watered}
        className="mt-2 text-sm font-medium px-4 py-1.5 rounded-full transition disabled:opacity-40"
        style={{ background: "var(--brand-50, #f0fdfa)", color: "#0f766e" }}
      >
        💧 Water your tree
      </button>
    </div>
  );
}
