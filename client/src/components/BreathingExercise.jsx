import React, { useEffect, useRef, useState } from "react";

const PHASES = [
  { label: "Breathe in", seconds: 4 },
  { label: "Hold", seconds: 4 },
  { label: "Breathe out", seconds: 6 },
];

export default function BreathingExercise({ title = "Guided breathing", onComplete }) {
  const [active, setActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PHASES[0].seconds);
  const [rounds, setRounds] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        setPhaseIndex((idx) => {
          const next = (idx + 1) % PHASES.length;
          if (next === 0) setRounds((r) => r + 1);
          setSecondsLeft(PHASES[next].seconds);
          return next;
        });
        return PHASES[(phaseIndex + 1) % PHASES.length].seconds;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function start() {
    setActive(true);
    setPhaseIndex(0);
    setSecondsLeft(PHASES[0].seconds);
    setRounds(0);
  }

  function stop() {
    setActive(false);
    clearInterval(timerRef.current);
  }

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-subtle p-6 text-center">
      <p className="text-sm font-semibold text-ink mb-4">{title}</p>

      {!active ? (
        <button
          onClick={start}
          className="w-40 h-40 mx-auto rounded-full bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center justify-center transition shadow-lg"
        >
          Start
        </button>
      ) : (
        <div className="space-y-3">
          <div
            className="w-40 h-40 mx-auto rounded-full bg-brand-100 border-4 border-brand-500 flex items-center justify-center transition-all duration-1000"
            style={{
              transform:
                PHASES[phaseIndex].label === "Breathe in"
                  ? "scale(1.15)"
                  : PHASES[phaseIndex].label === "Breathe out"
                  ? "scale(0.85)"
                  : "scale(1)",
            }}
          >
            <div className="text-center">
              <p className="font-bold text-brand-700">{PHASES[phaseIndex].label}</p>
              <p className="text-3xl font-extrabold text-brand-700">{secondsLeft}</p>
            </div>
          </div>
          <p className="text-xs text-faint">Rounds completed: {rounds}</p>
          <button onClick={stop} className="text-sm text-faint hover:text-red-500">
            Stop
          </button>
        </div>
      )}

      {onComplete && (
        <button
          onClick={onComplete}
          className="mt-4 w-full text-sm font-medium text-muted hover:text-ink transition"
        >
          {rounds > 0 ? "Continue →" : "Skip this →"}
        </button>
      )}
    </div>
  );
}
