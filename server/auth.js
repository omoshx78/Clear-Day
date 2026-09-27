import { nanoid } from "nanoid";
import crypto from "crypto";
import { supabase } from "./supabaseClient.js";

function normalizePhone(phone) {
  // Normalize Kenyan numbers to +254 format (accepts 07..., 01..., 254..., +254...)
  let p = String(phone || "").replace(/[\s-]/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("+")) p = p.slice(1);
  if (!p.startsWith("254")) p = "254" + p;
  return "+" + p;
}

// -- PIN hashing (scrypt, built into Node — no extra dependency needed) ----
//
// scrypt is deliberately CPU/memory-heavy — that's the point for a real
// password with meaningful entropy, but a 4-6 digit PIN only has ~1
// million possible values, and is already protected from brute force by
// the 5-attempt lockout below, not by how expensive the hash is to
// compute. Node's default cost parameter (N=16384) is tuned for real
// passwords and was adding real, measurable per-request latency on every
// single login — worse on CPU-constrained hosting like Render's free
// tier, where it's the difference between a login that feels instant and
// one that visibly drags.
//
// The chosen N is embedded directly in the stored hash string
// (`N:salt:hash`) precisely so this number can change later without
// breaking anyone: verifyPin reads back whichever N was used when that
// specific hash was created and matches it exactly, rather than assuming
// a single global value. Hashes stored before this change (format
// `salt:hash`, two parts, no N) are still verified correctly too — they
// implicitly used Node's old default of 16384, so that's what's applied
// for exactly those. Nobody's existing PIN breaks; only newly-created or
// newly-changed PINs get the lighter, faster setting.
const SCRYPT_N = 4096; // 4x lighter than Node's default (16384), still a real memory-hard KDF
const LEGACY_SCRYPT_N = 16384; // Node's default, used by hashes stored before this change

function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(pin), salt, 64, { N: SCRYPT_N }).toString("hex");
  return `${SCRYPT_N}:${salt}:${hash}`;
}

function verifyPin(pin, stored) {
  const parts = String(stored || "").split(":");
  let N, salt, hash;
  if (parts.length === 3) {
    [N, salt, hash] = parts;
    N = Number(N);
  } else if (parts.length === 2) {
    // Pre-existing hash from before cost was embedded in the string
    [salt, hash] = parts;
    N = LEGACY_SCRYPT_N;
  } else {
    return false;
  }
  if (!salt || !hash || !N) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const testHash = crypto.scryptSync(String(pin), salt, 64, { N });
  // Buffers must be equal length for timingSafeEqual, or it throws
  if (hashBuffer.length !== testHash.length) return false;
  return crypto.timingSafeEqual(hashBuffer, testHash);
}

const PIN_PATTERN = /^\d{4,6}$/;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const PIN_RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export { normalizePhone, hashPin, verifyPin, PIN_PATTERN, MAX_FAILED_ATTEMPTS, LOCKOUT_MS, PIN_RESET_TTL_MS };

export async function createSession(userId) {
  const token = nanoid(32);
  const { error } = await supabase.from("sessions").insert({ token, userId, createdAt: new Date().toISOString() });
  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return token;
}

export async function getUserIdForToken(token) {
  const { data, error } = await supabase.from("sessions").select("userId").eq("token", token).maybeSingle();
  if (error || !data) return null;
  return data.userId;
}

// "Last active" tracking for the admin dashboard — kept in memory rather
// than written to the database on every single request, to avoid needless
// write load on every authenticated call. This resets on server restart,
// which is fine for a live "who's using the app right now" view — it isn't
// meant to be a permanent record.
const lastActiveMap = new Map(); // userId -> ISO timestamp

export function touchLastActive(userId) {
  lastActiveMap.set(userId, new Date().toISOString());
}

export function getLastActive(userId) {
  return lastActiveMap.get(userId) || null;
}

// Express middleware: requires "Authorization: Bearer <token>", attaches req.userId
// Sessions never expire server-side (see the `sessions` table) — once
// issued, a token keeps working until the person explicitly logs out.
// Combined with storing it in localStorage on the client, this is what
// gives a web app "remember this device" behavior: no separate
// device-linking mechanism needed, since the token itself just persists
// in that one browser.
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

// Admin middleware — gates both the /admin dashboard UI and the
// curl-callable review endpoints behind one shared secret. Fine for a solo
// owner; swap for real per-staff accounts before you have an admin team.
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
