import { nanoid } from "nanoid";
import { db } from "./db.js";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const pendingOtps = new Map(); // phone -> { code, expiresAt }

function normalizePhone(phone) {
  // Normalize Kenyan numbers to +254 format (accepts 07..., 01..., 254..., +254...)
  let p = String(phone || "").replace(/[\s-]/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("+")) p = p.slice(1);
  if (!p.startsWith("254")) p = "254" + p;
  return "+" + p;
}

export function requestOtp(phoneRaw) {
  const phone = normalizePhone(phoneRaw);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  pendingOtps.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });

  // TODO (production): wire this to an SMS gateway — Africa's Talking is the
  // common choice for Kenyan apps (https://africastalking.com). For now the
  // code is logged so you can test end-to-end without SMS costs.
  console.log(`[OTP] ${phone} -> ${code} (expires in 5 min)`);

  return { phone };
}

export function verifyOtp(phoneRaw, code) {
  const phone = normalizePhone(phoneRaw);
  const entry = pendingOtps.get(phone);
  if (!entry) return { ok: false, error: "No OTP requested for this number" };
  if (Date.now() > entry.expiresAt) {
    pendingOtps.delete(phone);
    return { ok: false, error: "OTP expired, request a new one" };
  }
  if (entry.code !== String(code)) {
    return { ok: false, error: "Incorrect code" };
  }
  pendingOtps.delete(phone);
  return { ok: true, phone };
}

export async function createSession(userId) {
  const token = nanoid(32);
  db.data.sessions ||= [];
  db.data.sessions.push({ token, userId, createdAt: new Date().toISOString() });
  await db.write();
  return token;
}

export async function getUserIdForToken(token) {
  await db.read();
  const session = (db.data.sessions || []).find((s) => s.token === token);
  return session ? session.userId : null;
}

// "Last active" tracking for the admin dashboard — kept in memory rather
// than written to disk on every request, both to avoid slowing requests down
// and to avoid racing with each route's own read-modify-write of db.data
// (lowdb has no locking, so two concurrent writes can clobber each other).
// This resets on server restart, which is fine for a live "who's using the
// app right now" view — it isn't meant to be a permanent record.
const lastActiveMap = new Map(); // userId -> ISO timestamp

export function touchLastActive(userId) {
  lastActiveMap.set(userId, new Date().toISOString());
}

export function getLastActive(userId) {
  return lastActiveMap.get(userId) || null;
}

// Express middleware: requires "Authorization: Bearer <token>", attaches req.userId
export function requireAuth() {
  return async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing auth token" });
    const userId = await getUserIdForToken(token);
    if (!userId) return res.status(401).json({ error: "Invalid or expired session" });
    req.userId = userId;
    touchLastActive(userId); // fire-and-forget, never blocks the request
    next();
  };
}

// Admin middleware for the MVP admin/review actions (verifying providers and
// institutions). No admin UI exists yet — this is meant to be called with a
// tool like curl/Postman using the ADMIN_SECRET env var as a header. Replace
// with real staff accounts before you have real applicants to review.
const ADMIN_SECRET = process.env.ADMIN_SECRET || "dev-admin-secret";
if (!process.env.ADMIN_SECRET) {
  console.log(`[admin] No ADMIN_SECRET set — using dev default "dev-admin-secret". Set a real one before deploying.`);
}

export function requireAdmin() {
  return (req, res, next) => {
    const provided = req.headers["x-admin-secret"];
    if (provided !== ADMIN_SECRET) return res.status(401).json({ error: "Invalid admin secret" });
    next();
  };
}

export { normalizePhone };
