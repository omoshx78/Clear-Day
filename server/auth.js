import { nanoid } from "nanoid";
import crypto from "crypto";
import { db } from "./db.js";

function normalizePhone(phone) {
  // Normalize Kenyan numbers to +254 format (accepts 07..., 01..., 254..., +254...)
  let p = String(phone || "").replace(/[\s-]/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("+")) p = p.slice(1);
  if (!p.startsWith("254")) p = "254" + p;
  return "+" + p;
}

// -- PIN hashing (scrypt, built into Node — no extra dependency needed) ----
function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(pin), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPin(pin, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const testHash = crypto.scryptSync(String(pin), salt, 64);
  // Buffers must be equal length for timingSafeEqual, or it throws
  if (hashBuffer.length !== testHash.length) return false;
  return crypto.timingSafeEqual(hashBuffer, testHash);
}

const PIN_PATTERN = /^\d{4,6}$/;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export { normalizePhone, hashPin, verifyPin, PIN_PATTERN, MAX_FAILED_ATTEMPTS, LOCKOUT_MS };

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
// Sessions never expire server-side (see db.data.sessions) — once issued, a
// token keeps working until the person explicitly logs out. Combined with
// storing it in localStorage on the client, this is what gives a web app
// "remember this device" behavior: no separate device-linking mechanism
// needed, since the token itself just persists in that one browser.
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
