import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import { supabase } from "./supabaseClient.js";
import { PRESETS, calcStreak, calcMoneySaved } from "./presets.js";
import { createSession, requireAuth, requireAdmin, normalizePhone, getLastActive, hashPin, verifyPin, PIN_PATTERN, MAX_FAILED_ATTEMPTS, LOCKOUT_MS, PIN_RESET_TTL_MS, generateResetCode } from "./auth.js";
import { sendEmail, isEmailMockMode } from "./email.js";
import { randomQuote } from "./data-quotes.js";
import { weeklyHobbies } from "./data-hobbies.js";
import { CRISIS_RESOURCES } from "./data-crisis.js";
import { initiateStkPush, simulateMockCallback, isMockMode } from "./daraja.js";
import { PRO_PLAN, isProActive } from "./pro.js";
import { PROVIDER_SPECIALTIES, INSTITUTION_TYPES } from "./data-support.js";
import { PLACE_CATEGORIES, searchNearbyPlaces, geocode } from "./places.js";

const app = express();
app.use(cors());
app.use(express.json());

const auth = requireAuth();
const adminAuth = requireAdmin();

function dbError(res, error) {
  console.error("[db]", error.message);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}

async function getUserById(id) {
  return supabase.from("users").select("*").eq("id", id).maybeSingle();
}

app.get("/api/presets", (req, res) => {
  res.json(Object.values(PRESETS));
});

app.get("/api/crisis-resources", (req, res) => {
  res.json(CRISIS_RESOURCES);
});

app.get("/api/auth/check-phone", async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "phone required" });
  const normalized = normalizePhone(phone);
  const { data, error } = await supabase.from("users").select("id").eq("phone", normalized).maybeSingle();
  if (error) return dbError(res, error);
  res.json({ exists: Boolean(data) });
});

app.post("/api/auth/register", async (req, res) => {
  const { phone, pin, ageConfirmed } = req.body;
  if (!phone || !pin) return res.status(400).json({ error: "phone and pin required" });
  if (!PIN_PATTERN.test(String(pin))) return res.status(400).json({ error: "PIN must be 4-6 digits" });
  if (ageConfirmed !== true) return res.status(400).json({ error: "You must confirm you are 18 or older" });

  const normalized = normalizePhone(phone);
  const { data: existing, error: lookupError } = await supabase.from("users").select("id").eq("phone", normalized).maybeSingle();
  if (lookupError) return dbError(res, lookupError);
  if (existing) return res.status(409).json({ error: "This phone number is already registered. Try logging in instead." });

  const user = {
    id: nanoid(10),
    phone: normalized,
    pinHash: hashPin(pin),
    ageConfirmed: true,
    failedPinAttempts: 0,
    lockedUntil: null,
    createdAt: new Date().toISOString(),
  };
  const { error: insertError } = await supabase.from("users").insert(user);
  if (insertError) return dbError(res, insertError);

  const token = await createSession(user.id);
  res.status(201).json({ token, userId: user.id, isNewUser: true, onboarded: false });
});

app.post("/api/auth/login", async (req, res) => {
  const { phone, pin } = req.body;
  if (!phone || !pin) return res.status(400).json({ error: "phone and pin required" });

  const normalized = normalizePhone(phone);
  const { data: user, error } = await supabase.from("users").select("*").eq("phone", normalized).maybeSingle();
  if (error) return dbError(res, error);
  if (!user) return res.status(404).json({ error: "No account found for this number. Please sign up first." });

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
    return res.status(429).json({ error: `Too many incorrect attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` });
  }

  if (!verifyPin(pin, user.pinHash)) {
    const failedPinAttempts = (user.failedPinAttempts || 0) + 1;
    if (failedPinAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_MS).toISOString();
      await supabase.from("users").update({ failedPinAttempts: 0, lockedUntil }).eq("id", user.id);
      return res.status(429).json({ error: "Too many incorrect attempts. Try again in 15 minutes." });
    }
    await supabase.from("users").update({ failedPinAttempts }).eq("id", user.id);
    const remaining = MAX_FAILED_ATTEMPTS - failedPinAttempts;
    return res.status(401).json({ error: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} left.` });
  }

  await supabase.from("users").update({ failedPinAttempts: 0, lockedUntil: null }).eq("id", user.id);

  const token = await createSession(user.id);
  res.json({ token, userId: user.id, isNewUser: false, onboarded: Boolean(user.addiction) });
});

// -- Forgot PIN (self-service, only works if a recovery email is on file) --
app.post("/api/auth/forgot-pin", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone required" });
  const normalized = normalizePhone(phone);
  const { data: user, error } = await supabase.from("users").select("id,recoveryEmail").eq("phone", normalized).maybeSingle();
  if (error) return dbError(res, error);

  // Deliberately vague response either way — don't reveal whether a phone
  // number is registered or has a recovery email, same reasoning as most
  // "forgot password" flows.
  const genericResponse = { ok: true, message: "If that account has a recovery email on file, a reset code has been sent to it." };
  if (!user || !user.recoveryEmail) return res.json(genericResponse);

  const code = generateResetCode();
  await supabase.from("users").update({
    pinResetCode: code,
    pinResetExpiresAt: new Date(Date.now() + PIN_RESET_TTL_MS).toISOString(),
  }).eq("id", user.id);

  sendEmail({
    to: user.recoveryEmail,
    subject: "Your ClearDay PIN reset code",
    html: `<p>Your ClearDay PIN reset code is:</p><h2>${code}</h2><p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>`,
  }).catch((err) => console.error("[email] forgot-pin send failed:", err.message));

  res.json(genericResponse);
});

app.post("/api/auth/reset-pin", async (req, res) => {
  const { phone, code, newPin } = req.body;
  if (!phone || !code || !newPin) return res.status(400).json({ error: "phone, code, and newPin required" });
  if (!PIN_PATTERN.test(String(newPin))) return res.status(400).json({ error: "PIN must be 4-6 digits" });

  const normalized = normalizePhone(phone);
  const { data: user, error } = await supabase.from("users").select("*").eq("phone", normalized).maybeSingle();
  if (error) return dbError(res, error);
  if (!user || !user.pinResetCode) return res.status(400).json({ error: "Invalid or expired code" });
  if (new Date(user.pinResetExpiresAt) < new Date()) return res.status(400).json({ error: "This code has expired. Request a new one." });
  if (user.pinResetCode !== String(code)) return res.status(400).json({ error: "Incorrect code" });

  await supabase.from("users").update({
    pinHash: hashPin(newPin),
    pinResetCode: null,
    pinResetExpiresAt: null,
    failedPinAttempts: 0,
    lockedUntil: null,
  }).eq("id", user.id);

  res.json({ ok: true, message: "PIN updated. You can log in with your new PIN now." });
});

function sanitizeUser(user) {
  const { pinHash, failedPinAttempts, lockedUntil, pinResetCode, pinResetExpiresAt, ...safe } = user;
  return safe;
}

app.post("/api/users/me/profile", auth, async (req, res) => {
  const { addiction, quitDate, weeklySpend, goalDays } = req.body;
  if (!addiction || !PRESETS[addiction]) {
    return res.status(400).json({ error: "Invalid or missing addiction type" });
  }
  const updates = {
    addiction,
    quitDate: quitDate || new Date().toISOString(),
    weeklySpend: Number(weeklySpend) || 0,
    goalDays: Number(goalDays) || 21,
  };
  const { data: user, error } = await supabase.from("users").update(updates).eq("id", req.userId).select().maybeSingle();
  if (error) return dbError(res, error);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(sanitizeUser(user));
});

app.get("/api/users/me", auth, async (req, res) => {
  const { data: user, error } = await getUserById(req.userId);
  if (error) return dbError(res, error);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!user.addiction) return res.json({ ...sanitizeUser(user), onboarded: false });

  const streak = calcStreak(user.quitDate);
  const moneySaved = calcMoneySaved(user.quitDate, user.weeklySpend);
  const { data: myInstitution } = await supabase.from("institutions").select("id,name,status").eq("createdBy", user.id).maybeSingle();
  res.json({
    ...sanitizeUser(user),
    onboarded: true,
    preset: PRESETS[user.addiction],
    streak,
    moneySaved,
    goalReached: streak >= user.goalDays,
    isPro: isProActive(user),
    isVerifiedProvider: user.providerStatus === "verified",
    institutionAdminOf: myInstitution ? { id: myInstitution.id, name: myInstitution.name, status: myInstitution.status } : null,
  });
});

app.post("/api/users/me/relapse", auth, async (req, res) => {
  const { data: user, error } = await supabase
    .from("users")
    .update({ quitDate: new Date().toISOString() })
    .eq("id", req.userId)
    .select()
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(sanitizeUser(user));
});

app.post("/api/users/me/reminders", auth, async (req, res) => {
  const { enabled, time } = req.body;
  if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled (boolean) required" });
  if (time && !/^\d{2}:\d{2}$/.test(time)) return res.status(400).json({ error: "time must be in HH:MM format" });

  const { data: user, error: lookupError } = await getUserById(req.userId);
  if (lookupError) return dbError(res, lookupError);
  if (!user) return res.status(404).json({ error: "User not found" });

  const updates = { reminderOptIn: enabled, reminderTime: time || user.reminderTime || "19:00" };
  const { error } = await supabase.from("users").update(updates).eq("id", req.userId);
  if (error) return dbError(res, error);
  res.json({ ok: true, ...updates });
});

// -- Profile self-service: change PIN, set recovery email, export, delete --
app.post("/api/users/me/change-pin", auth, async (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!currentPin || !newPin) return res.status(400).json({ error: "currentPin and newPin required" });
  if (!PIN_PATTERN.test(String(newPin))) return res.status(400).json({ error: "New PIN must be 4-6 digits" });

  const { data: user, error } = await getUserById(req.userId);
  if (error) return dbError(res, error);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!verifyPin(currentPin, user.pinHash)) return res.status(401).json({ error: "Current PIN is incorrect" });

  const { error: updateError } = await supabase.from("users").update({ pinHash: hashPin(newPin) }).eq("id", req.userId);
  if (updateError) return dbError(res, updateError);
  res.json({ ok: true });
});

app.post("/api/users/me/recovery-email", auth, async (req, res) => {
  const { email } = req.body;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "That doesn't look like a valid email" });

  const { error } = await supabase.from("users").update({ recoveryEmail: email || null }).eq("id", req.userId);
  if (error) return dbError(res, error);
  res.json({ ok: true, recoveryEmail: email || null });
});

// Self-service export of everything this account has stored — profile,
// check-ins, journal, and messages they're party to. Never includes other
// people's data.
app.get("/api/users/me/export", auth, async (req, res) => {
  const { data: user, error: userError } = await getUserById(req.userId);
  if (userError) return dbError(res, userError);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [{ data: checkins }, { data: journal }, { data: sentMessages }, { data: receivedMessages }, { data: feedback }] = await Promise.all([
    supabase.from("checkins").select("*").eq("userId", req.userId),
    supabase.from("journal").select("*").eq("userId", req.userId),
    supabase.from("messages").select("*").eq("fromUserId", req.userId),
    supabase.from("messages").select("*").eq("toUserId", req.userId),
    supabase.from("feedback").select("*").eq("userId", req.userId),
  ]);

  res.setHeader("Content-Disposition", "attachment; filename=clearday-my-data.json");
  res.json({
    exportedAt: new Date().toISOString(),
    profile: sanitizeUser(user),
    checkins: checkins || [],
    journal: journal || [],
    messages: [...(sentMessages || []), ...(receivedMessages || [])],
    feedback: feedback || [],
  });
});

// Deletes the account and everything that references it (check-ins,
// journal, sessions, messages, institutions they created — all cascade via
// the foreign keys in schema.sql). Feedback rows are kept but anonymized
// (ON DELETE SET NULL), so support history isn't silently lost.
app.delete("/api/users/me", auth, async (req, res) => {
  // Scrub the phone number copy in feedback too — "userId" alone going null
  // (via the ON DELETE SET NULL foreign key) leaves the phone text behind,
  // which defeats the point of "delete my data".
  await supabase.from("feedback").update({ phone: null }).eq("userId", req.userId);
  const { error } = await supabase.from("users").delete().eq("id", req.userId);
  if (error) return dbError(res, error);
  res.json({ ok: true });
});

app.post("/api/checkins", auth, async (req, res) => {
  const { mood, cravingLevel, note } = req.body;
  const entry = {
    id: nanoid(10),
    userId: req.userId,
    mood: mood || null,
    cravingLevel: cravingLevel ?? null,
    note: note || "",
    date: new Date().toISOString(),
  };
  const { error } = await supabase.from("checkins").insert(entry);
  if (error) return dbError(res, error);
  res.status(201).json(entry);
});

app.get("/api/checkins/me", auth, async (req, res) => {
  const { data, error } = await supabase.from("checkins").select("*").eq("userId", req.userId).order("date", { ascending: false });
  if (error) return dbError(res, error);
  res.json(data);
});

app.post("/api/journal", auth, async (req, res) => {
  const { text, trigger } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  const entry = {
    id: nanoid(10),
    userId: req.userId,
    text,
    trigger: trigger || "",
    date: new Date().toISOString(),
  };
  const { error } = await supabase.from("journal").insert(entry);
  if (error) return dbError(res, error);
  res.status(201).json(entry);
});

app.get("/api/journal/me", auth, async (req, res) => {
  const { data, error } = await supabase.from("journal").select("*").eq("userId", req.userId).order("date", { ascending: false });
  if (error) return dbError(res, error);
  res.json(data);
});

app.get("/api/pro/plan", (req, res) => {
  res.json({ ...PRO_PLAN, mockMode: isMockMode });
});

app.get("/api/pro/status", auth, async (req, res) => {
  const { data: user, error } = await getUserById(req.userId);
  if (error) return dbError(res, error);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ isPro: isProActive(user), proExpiresAt: user.proExpiresAt || null });
});

app.post("/api/pro/checkout", auth, async (req, res) => {
  const { data: user, error: lookupError } = await getUserById(req.userId);
  if (lookupError) return dbError(res, lookupError);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    const { checkoutRequestId, mock } = await initiateStkPush({
      phone: user.phone,
      amount: PRO_PLAN.priceKes,
      accountReference: "ClearDay Pro",
      description: "ClearDay Pro monthly subscription",
    });

    const payment = {
      id: nanoid(10),
      userId: user.id,
      checkoutRequestId,
      amount: PRO_PLAN.priceKes,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const { error: insertError } = await supabase.from("payments").insert(payment);
    if (insertError) return dbError(res, insertError);

    if (mock) {
      simulateMockCallback(checkoutRequestId, async (result) => {
        await applyPaymentResult(result);
      });
    }

    res.status(202).json({
      checkoutRequestId,
      message: mock
        ? "Mock STK push sent — this will auto-confirm in a few seconds (dev mode)."
        : "Check your phone and enter your M-Pesa PIN to complete payment.",
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/pro/callback", async (req, res) => {
  try {
    const stk = req.body?.Body?.stkCallback;
    if (!stk) return res.status(400).json({ error: "Unexpected callback shape" });
    await applyPaymentResult({
      checkoutRequestId: stk.CheckoutRequestID,
      resultCode: stk.ResultCode,
      resultDesc: stk.ResultDesc,
    });
  } catch (err) {
    console.error("Daraja callback error:", err);
  }
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

async function applyPaymentResult({ checkoutRequestId, resultCode, resultDesc }) {
  const { data: payment, error } = await supabase.from("payments").select("*").eq("checkoutRequestId", checkoutRequestId).maybeSingle();
  if (error || !payment) return;

  const paymentUpdates = {
    status: resultCode === 0 ? "paid" : "failed",
    resultDesc,
    resolvedAt: new Date().toISOString(),
  };
  await supabase.from("payments").update(paymentUpdates).eq("id", payment.id);

  if (resultCode === 0) {
    const { data: user } = await getUserById(payment.userId);
    if (user) {
      const now = new Date();
      const base = user.proExpiresAt && new Date(user.proExpiresAt) > now ? new Date(user.proExpiresAt) : now;
      base.setDate(base.getDate() + PRO_PLAN.periodDays);
      await supabase.from("users").update({ isPro: true, proExpiresAt: base.toISOString() }).eq("id", user.id);
    }
  }
}

app.get("/api/pro/checkout/:checkoutRequestId", auth, async (req, res) => {
  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("checkoutRequestId", req.params.checkoutRequestId)
    .eq("userId", req.userId)
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  res.json(payment);
});

app.get("/api/analytics", auth, async (req, res) => {
  const { data: user, error: userError } = await getUserById(req.userId);
  if (userError) return dbError(res, userError);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!isProActive(user)) {
    return res.status(402).json({ error: "This is a Pro feature", upgradeRequired: true });
  }

  const { data: checkins, error } = await supabase.from("checkins").select("*").eq("userId", req.userId);
  if (error) return dbError(res, error);

  const byDayOfWeek = Array(7).fill(0).map(() => ({ count: 0, totalCraving: 0 }));
  checkins.forEach((c) => {
    const day = new Date(c.date).getDay();
    byDayOfWeek[day].count += 1;
    byDayOfWeek[day].totalCraving += Number(c.cravingLevel) || 0;
  });
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cravingByDay = byDayOfWeek.map((d, i) => ({
    day: dayLabels[i],
    avgCraving: d.count ? Math.round((d.totalCraving / d.count) * 10) / 10 : 0,
    checkins: d.count,
  }));

  const moodCounts = {};
  checkins.forEach((c) => {
    if (c.mood) moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
  });

  res.json({
    totalCheckins: checkins.length,
    avgCravingOverall: checkins.length
      ? Math.round((checkins.reduce((s, c) => s + (Number(c.cravingLevel) || 0), 0) / checkins.length) * 10) / 10
      : 0,
    cravingByDay,
    moodCounts,
  });
});

const lastQuoteMap = new Map();

app.get("/api/quotes/daily", auth, async (req, res) => {
  const { data: user, error } = await supabase.from("users").select("addiction").eq("id", req.userId).maybeSingle();
  if (error) return dbError(res, error);
  if (!user?.addiction) return res.status(400).json({ error: "Complete onboarding first" });
  const quote = randomQuote(user.addiction, lastQuoteMap.get(req.userId));
  lastQuoteMap.set(req.userId, quote.text);
  res.json(quote);
});

app.get("/api/quotes/random", auth, async (req, res) => {
  const { data: user, error } = await supabase.from("users").select("addiction").eq("id", req.userId).maybeSingle();
  if (error) return dbError(res, error);
  if (!user?.addiction) return res.status(400).json({ error: "Complete onboarding first" });
  const quote = randomQuote(user.addiction, lastQuoteMap.get(req.userId));
  lastQuoteMap.set(req.userId, quote.text);
  res.json(quote);
});

app.get("/api/hobbies", auth, async (req, res) => {
  const { data: user, error } = await supabase.from("users").select("addiction").eq("id", req.userId).maybeSingle();
  if (error) return dbError(res, error);
  if (!user?.addiction) return res.status(400).json({ error: "Complete onboarding first" });
  res.json(weeklyHobbies(user.addiction));
});

app.get("/api/providers/specialties", (req, res) => res.json(PROVIDER_SPECIALTIES));

app.post("/api/providers/apply", auth, async (req, res) => {
  const { displayName, bio, specialty, credentials } = req.body;
  if (!displayName || !bio || !specialty) {
    return res.status(400).json({ error: "displayName, bio, and specialty are required" });
  }
  const updates = {
    providerStatus: "pending",
    providerDisplayName: displayName,
    providerBio: bio,
    providerSpecialty: specialty,
    providerCredentials: credentials || "",
    providerAppliedAt: new Date().toISOString(),
  };
  const { error } = await supabase.from("users").update(updates).eq("id", req.userId);
  if (error) return dbError(res, error);
  res.json({ ok: true, status: "pending" });
});

app.get("/api/providers", async (req, res) => {
  const { specialty } = req.query;
  let query = supabase.from("users").select("id,providerDisplayName,providerBio,providerSpecialty").eq("providerStatus", "verified");
  if (specialty) query = query.eq("providerSpecialty", specialty);
  const { data, error } = await query;
  if (error) return dbError(res, error);
  res.json(data.map((p) => ({ id: p.id, displayName: p.providerDisplayName, bio: p.providerBio, specialty: p.providerSpecialty })));
});

app.get("/api/providers/:id", async (req, res) => {
  const { data: p, error } = await supabase
    .from("users")
    .select("id,providerDisplayName,providerBio,providerSpecialty,providerStatus")
    .eq("id", req.params.id)
    .eq("providerStatus", "verified")
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!p) return res.status(404).json({ error: "Provider not found" });
  res.json({ id: p.id, displayName: p.providerDisplayName, bio: p.providerBio, specialty: p.providerSpecialty });
});

app.get("/api/institutions/types", (req, res) => res.json(INSTITUTION_TYPES));

app.post("/api/institutions/apply", auth, async (req, res) => {
  const { name, type, contactPhone } = req.body;
  if (!name || !type) return res.status(400).json({ error: "name and type are required" });

  const institution = {
    id: nanoid(10),
    name,
    type,
    contactPhone: contactPhone || "",
    status: "pending",
    createdBy: req.userId,
    inviteCode: nanoid(8).toUpperCase(),
    createdAt: new Date().toISOString(),
  };
  const { error } = await supabase.from("institutions").insert(institution);
  if (error) return dbError(res, error);
  res.status(201).json(institution);
});

app.get("/api/institutions/me", auth, async (req, res) => {
  const { data: institution, error } = await supabase.from("institutions").select("*").eq("createdBy", req.userId).maybeSingle();
  if (error) return dbError(res, error);
  if (!institution) return res.status(404).json({ error: "No institution found for this account" });
  res.json(institution);
});

app.get("/api/institutions/me/dashboard", auth, async (req, res) => {
  const { data: institution, error } = await supabase.from("institutions").select("*").eq("createdBy", req.userId).maybeSingle();
  if (error) return dbError(res, error);
  if (!institution) return res.status(404).json({ error: "No institution found for this account" });
  if (institution.status !== "verified") {
    return res.status(403).json({ error: "Institution is not verified yet", status: institution.status });
  }

  const { data: members, error: membersError } = await supabase.from("users").select("addiction,quitDate,goalDays").eq("institutionId", institution.id);
  if (membersError) return dbError(res, membersError);

  const byAddiction = {};
  let totalStreak = 0;
  let goalReachedCount = 0;
  members.forEach((m) => {
    if (!m.addiction) return;
    byAddiction[m.addiction] = (byAddiction[m.addiction] || 0) + 1;
    const streak = calcStreak(m.quitDate);
    totalStreak += streak;
    if (streak >= (m.goalDays || 21)) goalReachedCount += 1;
  });

  res.json({
    institution: { name: institution.name, type: institution.type, inviteCode: institution.inviteCode },
    memberCount: members.length,
    avgStreak: members.length ? Math.round((totalStreak / members.length) * 10) / 10 : 0,
    goalReachedCount,
    byAddiction,
  });
});

app.post("/api/institutions/join", auth, async (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) return res.status(400).json({ error: "inviteCode required" });
  const { data: institution, error } = await supabase
    .from("institutions")
    .select("*")
    .eq("inviteCode", inviteCode.toUpperCase())
    .eq("status", "verified")
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!institution) return res.status(404).json({ error: "Invalid or unverified invite code" });

  const { error: updateError } = await supabase.from("users").update({ institutionId: institution.id }).eq("id", req.userId);
  if (updateError) return dbError(res, updateError);
  res.json({ ok: true, institutionName: institution.name });
});

app.get("/api/admin/providers/pending", adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("id,phone,providerDisplayName,providerBio,providerSpecialty,providerCredentials,providerAppliedAt")
    .eq("providerStatus", "pending");
  if (error) return dbError(res, error);
  res.json(
    data.map((u) => ({
      id: u.id,
      phone: u.phone,
      displayName: u.providerDisplayName,
      bio: u.providerBio,
      specialty: u.providerSpecialty,
      credentials: u.providerCredentials,
      appliedAt: u.providerAppliedAt,
    }))
  );
});

app.post("/api/admin/providers/:userId/verify", adminAuth, async (req, res) => {
  const { data, error } = await supabase.from("users").update({ providerStatus: "verified" }).eq("id", req.params.userId).select().maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return res.status(404).json({ error: "User not found" });
  res.json({ ok: true });
});

app.post("/api/admin/providers/:userId/reject", adminAuth, async (req, res) => {
  const { data, error } = await supabase.from("users").update({ providerStatus: "rejected" }).eq("id", req.params.userId).select().maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return res.status(404).json({ error: "User not found" });
  res.json({ ok: true });
});

app.get("/api/admin/institutions/pending", adminAuth, async (req, res) => {
  const { data, error } = await supabase.from("institutions").select("*").eq("status", "pending");
  if (error) return dbError(res, error);
  res.json(data);
});

app.post("/api/admin/institutions/:id/verify", adminAuth, async (req, res) => {
  const { data: institution, error } = await supabase.from("institutions").update({ status: "verified" }).eq("id", req.params.id).select().maybeSingle();
  if (error) return dbError(res, error);
  if (!institution) return res.status(404).json({ error: "Institution not found" });
  res.json({ ok: true, inviteCode: institution.inviteCode });
});

function conversationId(a, b) {
  return [a, b].sort().join("_");
}

app.post("/api/messages", auth, async (req, res) => {
  const { toUserId, text } = req.body;
  if (!toUserId || !text?.trim()) return res.status(400).json({ error: "toUserId and text required" });

  const { data: sender, error: senderError } = await getUserById(req.userId);
  if (senderError) return dbError(res, senderError);
  const { data: recipient, error: recipientError } = await getUserById(toUserId);
  if (recipientError) return dbError(res, recipientError);
  if (!recipient) return res.status(404).json({ error: "Recipient not found" });

  const senderIsVerifiedProvider = sender.providerStatus === "verified";
  const recipientIsVerifiedProvider = recipient.providerStatus === "verified";

  if (recipientIsVerifiedProvider && !senderIsVerifiedProvider && !isProActive(sender)) {
    return res.status(402).json({ error: "Messaging support providers is a Pro feature", upgradeRequired: true });
  }

  const message = {
    id: nanoid(10),
    conversationId: conversationId(req.userId, toUserId),
    fromUserId: req.userId,
    toUserId,
    text: text.trim(),
    date: new Date().toISOString(),
  };
  const { error } = await supabase.from("messages").insert(message);
  if (error) return dbError(res, error);
  res.status(201).json(message);
});

app.get("/api/messages/:otherUserId", auth, async (req, res) => {
  const cid = conversationId(req.userId, req.params.otherUserId);
  const { data, error } = await supabase.from("messages").select("*").eq("conversationId", cid).order("date", { ascending: true });
  if (error) return dbError(res, error);
  res.json(data);
});

app.get("/api/providers/me/conversations", auth, async (req, res) => {
  const { data: user, error: userError } = await supabase.from("users").select("providerStatus").eq("id", req.userId).maybeSingle();
  if (userError) return dbError(res, userError);
  if (user?.providerStatus !== "verified") return res.status(403).json({ error: "Not a verified provider" });

  const { data: myMessages, error } = await supabase
    .from("messages")
    .select("*")
    .or(`fromUserId.eq.${req.userId},toUserId.eq.${req.userId}`);
  if (error) return dbError(res, error);

  const partnerIds = [...new Set(myMessages.map((m) => (m.fromUserId === req.userId ? m.toUserId : m.fromUserId)))];

  const conversations = partnerIds
    .map((pid) => {
      const thread = myMessages.filter((m) => m.fromUserId === pid || m.toUserId === pid);
      const last = thread.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      return { userId: pid, lastMessage: last.text, lastDate: last.date };
    })
    .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));

  res.json(conversations);
});

app.post("/api/feedback", auth, async (req, res) => {
  const { category, message } = req.body;
  const validCategories = ["suggestion", "compliment", "complaint", "help"];
  if (!validCategories.includes(category)) return res.status(400).json({ error: "Invalid category" });
  if (!message?.trim()) return res.status(400).json({ error: "message required" });

  const { data: user } = await supabase.from("users").select("phone").eq("id", req.userId).maybeSingle();
  const entry = {
    id: nanoid(10),
    userId: req.userId,
    phone: user?.phone || null,
    category,
    message: message.trim(),
    status: "open",
    date: new Date().toISOString(),
  };
  const { error } = await supabase.from("feedback").insert(entry);
  if (error) return dbError(res, error);

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    sendEmail({
      to: adminEmail,
      subject: `ClearDay: new ${category} from ${entry.phone || "a user"}`,
      html: `<p><strong>Category:</strong> ${category}</p><p><strong>From:</strong> ${entry.phone || "unknown"}</p><p><strong>Message:</strong></p><p>${entry.message.replace(/</g, "&lt;")}</p>`,
    }).catch((err) => console.error("[email] feedback notification failed:", err.message));
  }

  res.status(201).json({ ok: true });
});

app.get("/api/admin/feedback", adminAuth, async (req, res) => {
  const { data, error } = await supabase.from("feedback").select("*").order("date", { ascending: false });
  if (error) return dbError(res, error);
  res.json(data);
});

app.post("/api/admin/feedback/:id/resolve", adminAuth, async (req, res) => {
  const { data, error } = await supabase.from("feedback").update({ status: "resolved" }).eq("id", req.params.id).select().maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

// -- Nearest places finder (churches, mosques, gyms, cafes, community centers) --
// Uses OpenStreetMap (free, no API key) — see server/places.js for why.
app.get("/api/places/categories", (req, res) => res.json(PLACE_CATEGORIES));

app.get("/api/places/nearby", auth, async (req, res) => {
  const { category, lat, lon, radius } = req.query;
  if (!category || !lat || !lon) return res.status(400).json({ error: "category, lat, lon required" });
  try {
    const results = await searchNearbyPlaces(category, parseFloat(lat), parseFloat(lon), Number(radius) || 5000);
    res.json(results);
  } catch (err) {
    console.error("[places] nearby search failed:", err.message);
    res.status(502).json({ error: "Could not fetch nearby places right now. Please try again." });
  }
});

app.get("/api/places/geocode", auth, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "q required" });
  try {
    const result = await geocode(q);
    if (!result) return res.status(404).json({ error: "Location not found. Try a more specific search." });
    res.json(result);
  } catch (err) {
    console.error("[places] geocode failed:", err.message);
    res.status(502).json({ error: "Could not search that location right now. Please try again." });
  }
});

app.get("/api/admin/stats", adminAuth, async (req, res) => {
  const [
    { data: users, error: usersError },
    { data: institutions, error: instError },
    { data: checkins, error: checkinsError },
    { data: journal, error: journalError },
    { data: messages, error: messagesError },
    { data: feedback, error: feedbackError },
  ] = await Promise.all([
    supabase.from("users").select("*"),
    supabase.from("institutions").select("status"),
    supabase.from("checkins").select("id"),
    supabase.from("journal").select("id"),
    supabase.from("messages").select("id"),
    supabase.from("feedback").select("status"),
  ]);
  const firstError = usersError || instError || checkinsError || journalError || messagesError || feedbackError;
  if (firstError) return dbError(res, firstError);

  const now = new Date();
  const dayMs = 86400000;

  const activeSince = (ms) => users.filter((u) => {
    const last = getLastActive(u.id);
    return last && now - new Date(last) < ms;
  }).length;

  const byAddiction = {};
  users.forEach((u) => { if (u.addiction) byAddiction[u.addiction] = (byAddiction[u.addiction] || 0) + 1; });

  const proUsers = users.filter((u) => isProActive(u));

  const providerCounts = { verified: 0, pending: 0, rejected: 0 };
  users.forEach((u) => { if (u.providerStatus && providerCounts[u.providerStatus] !== undefined) providerCounts[u.providerStatus] += 1; });

  const institutionCounts = { verified: 0, pending: 0 };
  institutions.forEach((i) => { if (institutionCounts[i.status] !== undefined) institutionCounts[i.status] += 1; });

  const signupsByDay = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * dayMs);
    const label = dayStart.toISOString().slice(0, 10);
    const count = users.filter((u) => u.createdAt && u.createdAt.slice(0, 10) === label).length;
    signupsByDay.push({ date: label, count });
  }

  res.json({
    totalUsers: users.length,
    onboardedUsers: users.filter((u) => u.addiction).length,
    activeLast24h: activeSince(dayMs),
    activeLast7d: activeSince(7 * dayMs),
    byAddiction,
    proSubscribers: proUsers.length,
    estimatedMonthlyRevenueKes: proUsers.length * PRO_PLAN.priceKes,
    providerCounts,
    institutionCounts,
    totalInstitutions: institutions.length,
    totalCheckins: checkins.length,
    totalJournalEntries: journal.length,
    totalMessages: messages.length,
    openFeedbackCount: feedback.filter((f) => f.status === "open").length,
    signupsByDay,
    daraja: { mockMode: isMockMode },
  });
});

// Admin-assisted PIN reset — the fallback for users who never set a
// recovery email (so the self-service /api/auth/forgot-pin can't reach
// them). Generates a fresh temporary PIN, shown once in this response for
// the admin to relay to the user directly (phone call, WhatsApp, etc. —
// whatever channel they contacted support through). The user should
// change it via /api/users/me/change-pin once they're back in.
app.post("/api/admin/users/:id/reset-pin", adminAuth, async (req, res) => {
  const tempPin = generateResetCode().slice(0, 6);
  const { data: user, error } = await supabase
    .from("users")
    .update({ pinHash: hashPin(tempPin), failedPinAttempts: 0, lockedUntil: null })
    .eq("id", req.params.id)
    .select("id,phone")
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ ok: true, phone: user.phone, tempPin });
});

app.get("/api/admin/users", adminAuth, async (req, res) => {
  const { data: users, error } = await supabase.from("users").select("*").order("createdAt", { ascending: false });
  if (error) return dbError(res, error);
  res.json(
    users.map((u) => ({
      id: u.id,
      phone: u.phone,
      addiction: u.addiction || null,
      streak: u.addiction ? calcStreak(u.quitDate) : null,
      isPro: isProActive(u),
      providerStatus: u.providerStatus || "none",
      institutionId: u.institutionId || null,
      createdAt: u.createdAt,
      lastActiveAt: getLastActive(u.id),
    }))
  );
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Quit-app server running on port ${PORT}`));
