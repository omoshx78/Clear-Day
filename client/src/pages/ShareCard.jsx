import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const ADDICTION_LABELS = { smoking: "Smoking", alcohol: "Alcohol", gambling: "Gambling" };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function ShareCard() {
  const canvasRef = useRef(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);

  useEffect(() => {
    api.getMe().then(setUser).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!user) return;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function draw() {
    const canvas = canvasRef.current;
    const W = 800, H = 1000;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Background gradient (matches app brand)
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#2dd4bf");
    bg.addColorStop(1, "#0f766e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Logo mark: sun over horizon, top-left
    const lx = 70, ly = 90;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    const rays = [
      [[lx + 30, ly - 12], [lx + 30, ly - 28]],
      [[lx + 8, ly - 4], [lx - 4, ly - 18]],
      [[lx + 52, ly - 4], [lx + 64, ly - 18]],
      [[lx - 12, ly + 10], [lx - 28, ly + 4]],
      [[lx + 72, ly + 10], [lx + 88, ly + 4]],
    ];
    rays.forEach(([[x1, y1], [x2, y2]]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(lx + 30, ly + 20, 26, Math.PI, 0);
    ctx.fill();
    roundRect(ctx, lx - 20, ly + 18, 100, 9, 4.5);
    ctx.fill();
    ctx.font = "600 30px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("ClearDay", lx + 105, ly + 20);

    // Streak number, centered
    ctx.textAlign = "center";
    ctx.font = "800 220px sans-serif";
    ctx.fillText(String(user.streak), W / 2, 420);

    ctx.font = "500 42px sans-serif";
    ctx.globalAlpha = 0.9;
    ctx.fillText(`days ${ADDICTION_LABELS[user.addiction] || user.addiction}-free`, W / 2, 500);
    ctx.globalAlpha = 1;

    // Card with stats
    const cardY = 600, cardH = 260;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRect(ctx, 70, cardY, W - 140, cardH, 28);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "500 26px sans-serif";
    ctx.globalAlpha = 0.85;
    ctx.fillText("Money saved so far", W / 2, cardY + 60);
    ctx.globalAlpha = 1;
    ctx.font = "800 56px sans-serif";
    ctx.fillText(`KES ${user.moneySaved}`, W / 2, cardY + 120);

    if (user.goalReached) {
      ctx.font = "600 30px sans-serif";
      ctx.fillText(`🎉 Goal of ${user.goalDays} days reached!`, W / 2, cardY + 200);
    } else {
      ctx.font = "500 28px sans-serif";
      ctx.globalAlpha = 0.85;
      ctx.fillText(`Working toward a ${user.goalDays}-day goal`, W / 2, cardY + 200);
      ctx.globalAlpha = 1;
    }

    // Footer
    ctx.font = "500 24px sans-serif";
    ctx.globalAlpha = 0.75;
    ctx.fillText("#ClearDayApp — one day at a time", W / 2, H - 50);
    ctx.globalAlpha = 1;
  }

  function getBlob() {
    return new Promise((resolve) => canvasRef.current.toBlob(resolve, "image/png"));
  }

  async function handleDownload() {
    const blob = await getBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cleardday-streak.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    const blob = await getBlob();
    const file = new File([blob], "cleardday-streak.png", { type: "image/png" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "My ClearDay streak" });
        setShared(true);
      } catch {
        // user cancelled share sheet — no error needed
      }
    } else {
      handleDownload();
    }
  }

  if (error) return <p className="max-w-md mx-auto px-4 py-12 text-red-500">{error}</p>;
  if (!user) return <p className="max-w-md mx-auto px-4 py-12 text-faint">Loading...</p>;

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-5">
      <h1 className="text-2xl font-bold text-ink text-center">Share your streak</h1>
      <div className="rounded-2xl overflow-hidden shadow-sm border border-subtle">
        <canvas ref={canvasRef} className="w-full block" />
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition"
        >
          Share
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 bg-subtlebg hover:bg-subtle text-ink font-semibold py-3 rounded-xl transition"
        >
          Download
        </button>
      </div>
      {shared && <p className="text-sm text-brand-600 text-center">Shared — nice work getting the word out.</p>}
      <p className="text-xs text-faint text-center">
        This image only shows your streak, days-free, and money saved — nothing private.
      </p>
    </div>
  );
}
