import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import BackBar from "../components/BackBar.jsx";

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

  function caption() {
    const days = user.streak;
    const label = ADDICTION_LABELS[user.addiction] || user.addiction;
    return `${days} days ${label}-free with ClearDay 🌅 One day at a time.`;
  }

  function shareToWhatsApp() {
    const text = `${caption()} ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");
  }

  function shareToFacebook() {
    const url = window.location.origin;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(caption())}`,
      "_blank",
      "noreferrer"
    );
  }

  function shareToX() {
    const url = window.location.origin;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption())}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noreferrer"
    );
  }

  if (error) return <p className="max-w-md mx-auto px-4 py-12 text-red-500">{error}</p>;
  if (!user) return <p className="max-w-md mx-auto px-4 py-12 text-faint">Loading...</p>;

  return (
    <>
      <BackBar />
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
          Share image
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 bg-subtlebg hover:bg-subtle text-ink font-semibold py-3 rounded-xl transition"
        >
          Download
        </button>
      </div>

      <div>
        <p className="text-xs text-faint text-center mb-2">Or post your progress directly</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={shareToWhatsApp}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white transition"
            style={{ background: "#25D366" }}
            aria-label="Share to WhatsApp"
            title="Share to WhatsApp"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.87 9.87 0 004.76 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.81 14.07c-.24.68-1.4 1.3-1.93 1.36-.49.06-1.11.08-1.79-.11-.41-.12-.94-.29-1.62-.57-2.84-1.23-4.7-4.1-4.84-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.08.99-2.36c.26-.28.56-.35.75-.35h.53c.17 0 .4-.03.62.47.24.56.81 1.94.88 2.08.07.14.11.3.02.48-.09.18-.14.3-.28.46-.14.16-.28.35-.4.47-.14.14-.28.29-.12.56.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.68-.79.86-1.07.18-.28.36-.23.6-.14.24.09 1.53.72 1.79.85.26.14.44.2.5.32.06.12.06.68-.18 1.35z"/></svg>
          </button>
          <button
            onClick={shareToFacebook}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white transition"
            style={{ background: "#1877F2" }}
            aria-label="Share to Facebook"
            title="Share to Facebook"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z"/></svg>
          </button>
          <button
            onClick={shareToX}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white transition"
            style={{ background: "#000000" }}
            aria-label="Share to X"
            title="Share to X"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23.3 22h-7.1l-5.5-7.2L4.4 22H1.3l8.1-9.3L1 2h7.3l5 6.6L18.9 2zm-1.2 18h1.9L7.4 4H5.3l12.4 16z"/></svg>
          </button>
        </div>
        <p className="text-xs text-faint text-center mt-2">
          These post your streak as text with a link — for the image itself, use "Share image" or "Download" above.
        </p>
      </div>

      {shared && <p className="text-sm text-brand-600 text-center">Shared — nice work getting the word out.</p>}
      <p className="text-xs text-faint text-center">
        This image only shows your streak, days-free, and money saved — nothing private.
      </p>
      </div>
    </>
  );
}
