// Server-only auth: password hashing and the signed session cookie.
//
// Uses node:crypto throughout — scrypt for passwords and HMAC-SHA256 for the
// session token — so the app keeps its zero-runtime-dependency posture
// (node:sqlite, node:crypto). Never import this from a client component.
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { getWriteDb } from "./db";
import { getUserByEmail, getUserByUsername } from "./queries";

export const SESSION_COOKIE = "unifind_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  email: string;
  username: string;
  phone: string | null;
};

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string };

// ---- password hashing ------------------------------------------------------

// Stored as `scrypt$N$r$p$<salt b64>$<hash b64>` so the cost parameters travel
// with the hash and can be changed later without breaking old rows.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

function maxmem(n: number, r: number): number {
  return 128 * n * r * 2;
}

export function hashPassword(password: string, salt?: Buffer): string {
  const s = salt ?? randomBytes(16);
  const hash = scryptSync(password, s, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: maxmem(SCRYPT_N, SCRYPT_R),
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    s.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  try {
    const expected = Buffer.from(parts[5], "base64");
    const actual = scryptSync(password, Buffer.from(parts[4], "base64"), expected.length, {
      N: n,
      r,
      p,
      maxmem: maxmem(n, r),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// ---- session cookie --------------------------------------------------------

// AUTH_SECRET should be set in .env.local. The fallback keeps local development
// working out of the box; it is deliberately not a secret.
function sessionSecret(): string {
  return process.env.AUTH_SECRET ?? "unifind-development-secret-not-for-production";
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function encodeSession(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, issuedAt: Date.now() }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(token: string): string | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const payload = token.slice(0, separator);
  const mac = Buffer.from(token.slice(separator + 1));
  const expectedMac = Buffer.from(sign(payload));
  if (mac.length !== expectedMac.length || !timingSafeEqual(mac, expectedMac)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data?.email === "string" ? data.email : null;
  } catch {
    return null;
  }
}

// Mirrors the `substr(email, 1, instr(email, '@') - 1)` convention in
// lib/queries.ts: a user's handle is the local part of their email.
export function usernameFromEmail(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function toSessionUser(email: string, phone: string | null): SessionUser {
  return { email, username: usernameFromEmail(email), phone };
}

// Reads the session cookie and resolves it against the database. Reading
// cookies makes every route that calls this dynamic.
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const email = decodeSession(token);
  if (!email) return null;

  const user = getUserByEmail(email);
  if (!user) return null;

  return toSessionUser(user.email, user.phone_number);
}

export async function createSession(email: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(email), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// ---- credentials -----------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalisePhone(phone: string): string | null {
  const trimmed = phone.trim();
  return trimmed === "" ? null : trimmed;
}

// The login field accepts either the handle ("josa_organizer") or the full
// email; the "@" decides which lookup to use. Accounts are still keyed by
// email — the handle is derived from it, exactly as USERNAME_SQL does.
export function authenticate(identifier: string, password: string): AuthResult {
  const raw = identifier.trim();
  if (!raw || !password) {
    return { ok: false, error: "Enter your username and password." };
  }

  const user = raw.includes("@")
    ? getUserByEmail(normaliseEmail(raw))
    : getUserByUsername(raw);

  // Same message either way, so the response does not reveal which accounts exist.
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { ok: false, error: "That username and password combination is not right." };
  }

  return { ok: true, user: toSessionUser(user.email, user.phone_number) };
}

export function register(email: string, password: string, phone: string): AuthResult {
  const address = normaliseEmail(email);

  if (!EMAIL_RE.test(address)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (getUserByEmail(address)) {
    return { ok: false, error: "An account with that email already exists." };
  }

  // Handles are a login credential now, and they are derived from the email
  // local-part rather than stored — so two addresses could otherwise share one
  // ("a@x.com" and "a@y.com") and getUserByUsername would return either at random.
  if (getUserByUsername(usernameFromEmail(address))) {
    return { ok: false, error: "That username is already taken." };
  }

  const phoneNumber = normalisePhone(phone);
  getWriteDb()
    .prepare(
      "INSERT INTO users (email, password_hash, phone_number) VALUES (?, ?, ?)",
    )
    .run(address, hashPassword(password), phoneNumber);

  return { ok: true, user: toSessionUser(address, phoneNumber) };
}
