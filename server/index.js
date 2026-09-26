import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import { db, initDb } from "./db.js";
import { PRESETS, calcStreak, calcMoneySaved } from "./presets.js";
import { createSession, requireAuth, requireAdmin, normalizePhone, getLastActive, hashPin, verifyPin, PIN_PATTERN, MAX_FAILED_ATTEMPTS, LOCKOUT_MS } from "./auth.js";
import { randomQuote } from "./data-quotes.js";
import { weeklyHobbies } from "./data-hobbies.js";
import { CRISIS_RESOURCES } from "./data-crisis.js";
import { initiateStkPush, simulateMockCallback, isMockMode } from "./daraja.js";
import { PRO_PLAN, isProActive } from "./pro.js";
import { PROVIDER_SPECIALTIES, INSTITUTION_TYPES } from "./data-support.js";

const app = express();
app.use(cors());
app.use(express.json());

await initDb();
const auth = requireAuth();
const adminAuth = requireAdmin();

// -- Public: presets, crisis resources -------------------------------------
app.get("/api/presets", (req, res) => {
  res.json(Object.values(PRESETS));
});

// Crisis resources are ALWAYS public — never gated behind login or a paywall
app.get("/api/crisis-resources", (req, res) => {
  res.json(CRISIS_RESOURCES);
});

// -- Auth: phone number + PIN -------------------------------------------
// Web "remember this device" is just a long-lived session token kept in the
// browser's localStorage (see server/auth.js) — no SMS/email step needed to
// stay logged in on the same browser.

// Lets the frontend know whether to show a login PIN box or a "create a PIN" flow
app.get("/api/auth/check-phone", async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "phone required" });
  await db.read();
  const normalized = normalizePhone(phone);
  const exists = db.data.users.some((u) => u.phone === normalized);
  res.json({ exists });
});

app.post("/api/auth/register", async (req, res) => {
  const { phone, pin, ageConfirmed } = req.body;
  if (!phone || !pin) return res.status(400).json({ error: "phone and pin required" });
  if (!PIN_PATTERN.test(String(pin))) return res.status(400).json({ error: "PIN must be 4-6 digits" });
  if (ageConfirmed !== true) return res.status(400).json({ error: "You must confirm you are 18 or older" });

  await db.read();
  const normalized = normalizePhone(phone);
  if (db.data.users.some((u) => u.phone === normalized)) {
    return res.status(409).json({ error: "This phone number is already registered. Try logging in instead." });
  }

  const user = {
    id: nanoid(10),
    phone: normalized,
    pinHash: hashPin(pin),
    ageConfirmed: true,
    failedPinAttempts: 0,
    lockedUntil: null,
    createdAt: new Date().toISOString(),
  };
  db.data.users.push(user);
  await db.write();

  const token = await createSession(user.id);
  res.status(201).json({ token, userId: user.id, isNewUser: true, onboarded: false });
});

app.post("/api/auth/login", async (req, res) => {
  const { phone, pin } = req.body;
  if (!phone || !pin) return res.status(400).json({ error: "phone and pin required" });

  await db.read();
  const normalized = normalizePhone(phone);
  const user = db.data.users.find((u) => u.phone === normalized);
  if (!user) return res.status(404).json({ error: "No account found for this number. Please sign up first." });

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
    return res.status(429).json({ error: `Too many incorrect attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` });
  }

  if (!verifyPin(pin, user.pinHash)) {
    user.failedPinAttempts = (user.failedPinAttempts || 0) + 1;
    if (user.failedPinAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_MS).toISOString();
      user.failedPinAttempts = 0;
      await db.write();
      return res.status(429).json({ error: "Too many incorrect attempts. Try again in 15 minutes." });
    }
    await db.write();
    const remaining = MAX_FAILED_ATTEMPTS - user.failedPinAttempts;
    return res.status(401).json({ error: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} left.` });
  }

  user.failedPinAttempts = 0;
  user.lockedUntil = null;
  await db.write();

  const token = await createSession(user.id);
  res.json({ token, userId: user.id, isNewUser: false, onboarded: Boolean(user.addiction) });
});

// -- Users (protected) ----------------------------------------------------
// Complete/update the quit-journey profile for the logged-in user
// Never send the PIN hash (or other internal bookkeeping) back to the client
function sanitizeUser(user) {
  const { pinHash, failedPinAttempts, lockedUntil, ...safe } = user;
  return safe;
}

app.post("/api/users/me/profile", auth, async (req, res) => {
  const { addiction, quitDate, weeklySpend, goalDays } = req.body;
  if (!addiction || !PRESETS[addiction]) {
    return res.status(400).json({ error: "Invalid or missing addiction type" });
  }
  await db.read();
  const user = db.data.users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.addiction = addiction;
  user.quitDate = quitDate || new Date().toISOString();
  user.weeklySpend = Number(weeklySpend) || 0;
  user.goalDays = Number(goalDays) || 21;
  await db.write();
  res.json(sanitizeUser(user));
});

app.get("/api/users/me", auth, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!user.addiction) return res.json({ ...sanitizeUser(user), onboarded: false });

  const streak = calcStreak(user.quitDate);
  const moneySaved = calcMoneySaved(user.quitDate, user.weeklySpend);
  const myInstitution = db.data.institutions.find((i) => i.createdBy === user.id);
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

// Reset a relapse: move quit date back to today
app.post("/api/users/me/relapse", auth, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.quitDate = new Date().toISOString();
  await db.write();
  res.json(sanitizeUser(user));
});

// Daily reminder preference — actual delivery is handled client-side via the
// browser Notification API while the app is open (see the note in README);
// this just persists the preference so it survives across sessions/devices.
app.post("/api/users/me/reminders", auth, async (req, res) => {
  const { enabled, time } = req.body;
  if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled (boolean) required" });
  if (time && !/^\d{2}:\d{2}$/.test(time)) return res.status(400).json({ error: "time must be in HH:MM format" });
  await db.read();
  const user = db.data.users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.reminderOptIn = enabled;
  user.reminderTime = time || user.reminderTime || "19:00";
  await db.write();
  res.json({ ok: true, reminderOptIn: user.reminderOptIn, reminderTime: user.reminderTime });
});

// -- Daily check-ins (protected) -----------------------------------------
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
  db.data.checkins.push(entry);
  await db.write();
  res.status(201).json(entry);
});

app.get("/api/checkins/me", auth, async (req, res) => {
  await db.read();
  const entries = db.data.checkins
    .filter((c) => c.userId === req.userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(entries);
});

// -- Journal (protected) -------------------------------------------------
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
  db.data.journal.push(entry);
  await db.write();
  res.status(201).json(entry);
});

app.get("/api/journal/me", auth, async (req, res) => {
  await db.read();
  const entries = db.data.journal
    .filter((j) => j.userId === req.userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(entries);
});

// -- Pro tier: M-Pesa Daraja billing --------------------------------------
app.get("/api/pro/plan", (req, res) => {
  res.json({ ...PRO_PLAN, mockMode: isMockMode });
});

app.get("/api/pro/status", auth, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ isPro: isProActive(user), proExpiresAt: user.proExpiresAt || null });
});

// Kick off an STK push prompt to the user's phone for one Pro billing cycle
app.post("/api/pro/checkout", auth, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.userId);
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
    db.data.payments.push(payment);
    await db.write();

    // In mock mode, simulate Safaricom's callback arriving a few seconds
    // later so the full pending -> paid flow can be tested without real
    // credentials (see server/daraja.js).
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

// Safaricom calls this URL asynchronously once the customer completes (or
// cancels) the STK push prompt. Must stay public — Safaricom's servers call
// it directly, with no user session.
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
  // Safaricom expects a 200 with this exact shape regardless of outcome
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

async function applyPaymentResult({ checkoutRequestId, resultCode, resultDesc }) {
  await db.read();
  const payment = db.data.payments.find((p) => p.checkoutRequestId === checkoutRequestId);
  if (!payment) return;

  payment.status = resultCode === 0 ? "paid" : "failed";
  payment.resultDesc = resultDesc;
  payment.resolvedAt = new Date().toISOString();

  if (resultCode === 0) {
    const user = db.data.users.find((u) => u.id === payment.userId);
    if (user) {
      const now = new Date();
      // Extend from current expiry if still active, else from now
      const base = user.proExpiresAt && new Date(user.proExpiresAt) > now ? new Date(user.proExpiresAt) : now;
      base.setDate(base.getDate() + PRO_PLAN.periodDays);
      user.isPro = true;
      user.proExpiresAt = base.toISOString();
    }
  }
  await db.write();
}

// Lets the client poll while waiting for the callback (especially useful in
// mock mode, and as a fallback if a real Safaricom callback is delayed)
app.get("/api/pro/checkout/:checkoutRequestId", auth, async (req, res) => {
  await db.read();
  const payment = db.data.payments.find(
    (p) => p.checkoutRequestId === req.params.checkoutRequestId && p.userId === req.userId
  );
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  res.json(payment);
});

// -- Pro-only: advanced analytics -----------------------------------------
app.get("/api/analytics", auth, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!isProActive(user)) {
    return res.status(402).json({ error: "This is a Pro feature", upgradeRequired: true });
  }

  const checkins = db.data.checkins.filter((c) => c.userId === req.userId);
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

// -- Quotes (protected — tailored to the user's addiction) ----------------
// Random each time the dashboard loads (including on every login), skipping
// an immediate repeat of whatever was shown last so it doesn't feel stuck
// on the same line.
const lastQuoteMap = new Map(); // userId -> quote text

app.get("/api/quotes/daily", auth, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.userId);
  if (!user?.addiction) return res.status(400).json({ error: "Complete onboarding first" });
  const quote = randomQuote(user.addiction, lastQuoteMap.get(req.userId));
  lastQuoteMap.set(req.userId, quote.text);
  res.json(quote);
});

app.get("/api/quotes/random", auth, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.userId);
  if (!user?.addiction) return res.status(400).json({ error: "Complete onboarding first" });
  const quote = randomQuote(user.addiction, lastQuoteMap.get(req.userId));
  lastQuoteMap.set(req.userId, quote.text);
  res.json(quote);
});

// -- Hobby suggestions (protected) ----------------------------------------
app.get("/api/hobbies", auth, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.userId);
  if (!user?.addiction) return res.status(400).json({ error: "Complete onboarding first" });
  res.json(weeklyHobbies(user.addiction));
});

// -- Support providers -----------------------------------------------------
app.get("/api/providers/specialties", (req, res) => res.json(PROVIDER_SPECIALTIES));

// Apply to become a verified support provider (counselor, chaplain, coach, etc.)
app.post("/api/providers/apply", auth, async (req, res) => {
  const { displayName, bio, specialty, credentials } = req.body;
  if (!displayName || !bio || !specialty) {
    return res.status(400).json({ error: "displayName, bio, and specialty are required" });
  }
  await db.read();
  const user = db.data.users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.providerStatus = "pending";
  user.providerDisplayName = displayName;
  user.providerBio = bio;
  user.providerSpecialty = specialty;
  user.providerCredentials = credentials || "";
  user.providerAppliedAt = new Date().toISOString();
  await db.write();
  res.json({ ok: true, status: "pending" });
});

// Public directory of verified providers (no phone numbers or other private data)
app.get("/api/providers", async (req, res) => {
  await db.read();
  const { specialty } = req.query;
  let providers = db.data.users.filter((u) => u.providerStatus === "verified");
  if (specialty) providers = providers.filter((p) => p.providerSpecialty === specialty);
  res.json(
    providers.map((p) => ({
      id: p.id,
      displayName: p.providerDisplayName,
      bio: p.providerBio,
      specialty: p.providerSpecialty,
    }))
  );
});

app.get("/api/providers/:id", async (req, res) => {
  await db.read();
  const p = db.data.users.find((u) => u.id === req.params.id && u.providerStatus === "verified");
  if (!p) return res.status(404).json({ error: "Provider not found" });
  res.json({ id: p.id, displayName: p.providerDisplayName, bio: p.providerBio, specialty: p.providerSpecialty });
});

// -- Institutions -----------------------------------------------------------
app.get("/api/institutions/types", (req, res) => res.json(INSTITUTION_TYPES));

// Register an institution (church, mosque, NACADA center, rehab, employer, NGO)
app.post("/api/institutions/apply", auth, async (req, res) => {
  const { name, type, contactPhone } = req.body;
  if (!name || !type) return res.status(400).json({ error: "name and type are required" });
  await db.read();

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
  db.data.institutions.push(institution);
  await db.write();
  res.status(201).json(institution);
});

// The institution an admin user created/manages, and its cohort's aggregate progress
app.get("/api/institutions/me", auth, async (req, res) => {
  await db.read();
  const institution = db.data.institutions.find((i) => i.createdBy === req.userId);
  if (!institution) return res.status(404).json({ error: "No institution found for this account" });
  res.json(institution);
});

app.get("/api/institutions/me/dashboard", auth, async (req, res) => {
  await db.read();
  const institution = db.data.institutions.find((i) => i.createdBy === req.userId);
  if (!institution) return res.status(404).json({ error: "No institution found for this account" });
  if (institution.status !== "verified") {
    return res.status(403).json({ error: "Institution is not verified yet", status: institution.status });
  }

  const members = db.data.users.filter((u) => u.institutionId === institution.id);
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

  // Aggregated and anonymized ONLY — never individual names, phones, or journal content
  res.json({
    institution: { name: institution.name, type: institution.type, inviteCode: institution.inviteCode },
    memberCount: members.length,
    avgStreak: members.length ? Math.round((totalStreak / members.length) * 10) / 10 : 0,
    goalReachedCount,
    byAddiction,
  });
});

// Join an institution's cohort with an invite code
app.post("/api/institutions/join", auth, async (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) return res.status(400).json({ error: "inviteCode required" });
  await db.read();
  const institution = db.data.institutions.find(
    (i) => i.inviteCode === inviteCode.toUpperCase() && i.status === "verified"
  );
  if (!institution) return res.status(404).json({ error: "Invalid or unverified invite code" });

  const user = db.data.users.find((u) => u.id === req.userId);
  user.institutionId = institution.id;
  await db.write();
  res.json({ ok: true, institutionName: institution.name });
});

// -- Admin: review provider and institution applications -------------------
// No admin UI yet — call these with the ADMIN_SECRET header (see server/auth.js)
app.get("/api/admin/providers/pending", adminAuth, async (req, res) => {
  await db.read();
  const pending = db.data.users
    .filter((u) => u.providerStatus === "pending")
    .map((u) => ({
      id: u.id,
      phone: u.phone,
      displayName: u.providerDisplayName,
      bio: u.providerBio,
      specialty: u.providerSpecialty,
      credentials: u.providerCredentials,
      appliedAt: u.providerAppliedAt,
    }));
  res.json(pending);
});

app.post("/api/admin/providers/:userId/verify", adminAuth, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.providerStatus = "verified";
  await db.write();
  res.json({ ok: true });
});

app.post("/api/admin/providers/:userId/reject", adminAuth, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.providerStatus = "rejected";
  await db.write();
  res.json({ ok: true });
});

app.get("/api/admin/institutions/pending", adminAuth, async (req, res) => {
  await db.read();
  res.json(db.data.institutions.filter((i) => i.status === "pending"));
});

app.post("/api/admin/institutions/:id/verify", adminAuth, async (req, res) => {
  await db.read();
  const institution = db.data.institutions.find((i) => i.id === req.params.id);
  if (!institution) return res.status(404).json({ error: "Institution not found" });
  institution.status = "verified";
  await db.write();
  res.json({ ok: true, inviteCode: institution.inviteCode });
});

// -- 1:1 messaging with verified support providers (Pro feature) -----------
function conversationId(a, b) {
  return [a, b].sort().join("_");
}

app.post("/api/messages", auth, async (req, res) => {
  const { toUserId, text } = req.body;
  if (!toUserId || !text?.trim()) return res.status(400).json({ error: "toUserId and text required" });
  await db.read();

  const sender = db.data.users.find((u) => u.id === req.userId);
  const recipient = db.data.users.find((u) => u.id === toUserId);
  if (!recipient) return res.status(404).json({ error: "Recipient not found" });

  const senderIsVerifiedProvider = sender.providerStatus === "verified";
  const recipientIsVerifiedProvider = recipient.providerStatus === "verified";

  // Starting a conversation with a provider requires Pro. Providers can
  // always reply for free, and a provider messaging another provider isn't
  // gated either — the Pro gate is specifically "get 1:1 access to a provider".
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
  db.data.messages.push(message);
  await db.write();
  res.status(201).json(message);
});

app.get("/api/messages/:otherUserId", auth, async (req, res) => {
  await db.read();
  const cid = conversationId(req.userId, req.params.otherUserId);
  const thread = db.data.messages.filter((m) => m.conversationId === cid).sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(thread);
});

// For a provider's inbox: list everyone who has messaged them, most recent first
app.get("/api/providers/me/conversations", auth, async (req, res) => {
  await db.read();
  const user = db.data.users.find((u) => u.id === req.userId);
  if (user?.providerStatus !== "verified") return res.status(403).json({ error: "Not a verified provider" });

  const myMessages = db.data.messages.filter((m) => m.fromUserId === req.userId || m.toUserId === req.userId);
  const partnerIds = [...new Set(myMessages.map((m) => (m.fromUserId === req.userId ? m.toUserId : m.fromUserId)))];

  const conversations = partnerIds.map((pid) => {
    const thread = myMessages.filter((m) => m.fromUserId === pid || m.toUserId === pid);
    const last = thread.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    return { userId: pid, lastMessage: last.text, lastDate: last.date };
  }).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));

  res.json(conversations);
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

// -- Admin: platform stats & user list --------------------------------------
// The owner's view of how the app is doing: signups, active users, Pro
// revenue, and provider/institution pipeline — all in one call.
app.get("/api/admin/stats", adminAuth, async (req, res) => {
  await db.read();
  const users = db.data.users;
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
  db.data.institutions.forEach((i) => { if (institutionCounts[i.status] !== undefined) institutionCounts[i.status] += 1; });

  // Signups per day for the last 7 days, oldest first — enough for a simple trend
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
    totalInstitutions: db.data.institutions.length,
    totalCheckins: db.data.checkins.length,
    totalJournalEntries: db.data.journal.length,
    totalMessages: db.data.messages.length,
    signupsByDay,
    daraja: { mockMode: isMockMode },
  });
});

// Full user list for the owner — includes phone numbers (needed to actually
// run the business), but never journal or message content.
app.get("/api/admin/users", adminAuth, async (req, res) => {
  await db.read();
  const users = db.data.users.map((u) => ({
    id: u.id,
    phone: u.phone,
    addiction: u.addiction || null,
    streak: u.addiction ? calcStreak(u.quitDate) : null,
    isPro: isProActive(u),
    providerStatus: u.providerStatus || "none",
    institutionId: u.institutionId || null,
    createdAt: u.createdAt,
    lastActiveAt: getLastActive(u.id),
  })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(users);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Quit-app server running on port ${PORT}`));
