import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Login for the app.
//  - The admin's username and password are in .env.local. The admin creates the clients.
//  - A client's password is stored in the database only as a scrambled hash.
//  - After logging in, the browser holds a signed cookie that says who it is.
//    The signature means the cookie cannot be edited or made up.

export interface Session {
  role: "admin" | "client";
  /** The client's id; empty for the admin */
  clientId: string;
  /** Name to show in the header */
  name: string;
  /** When the session stops working (milliseconds since 1970) */
  expires: number;
}

const COOKIE = "rb_session";
const WEEK = 7 * 24 * 60 * 60; // seconds

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Set SESSION_SECRET in .env.local (at least 32 characters).");
  return value;
}

const sign = (text: string) => createHmac("sha256", secret()).update(text).digest("base64url");

// Compare two texts without leaking, through timing, how much of them matched
function sameText(a: string, b: string) {
  const left = createHmac("sha256", secret()).update(a).digest();
  const right = createHmac("sha256", secret()).update(b).digest();
  return timingSafeEqual(left, right);
}

// ---- Passwords ----

/** Scramble a password for storing: "scrypt$<salt>$<hash>". It cannot be turned back into the password. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${scryptSync(password, salt, 64).toString("base64url")}`;
}

export function passwordMatches(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** Is this the admin login from .env.local? */
export function isAdminLogin(username: string, password: string): boolean {
  const adminName = process.env.ADMIN_USERNAME ?? "";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!adminName || !adminPassword) return false;
  // Check both even if the first is wrong, so the time taken says nothing
  const nameOk = sameText(username.trim().toLowerCase(), adminName.trim().toLowerCase());
  const passwordOk = sameText(password, adminPassword);
  return nameOk && passwordOk;
}

export const adminUsername = () => (process.env.ADMIN_USERNAME ?? "").trim().toLowerCase();

// ---- Sessions ----

/** Log the browser in: store a signed cookie */
export async function startSession(session: Omit<Session, "expires">) {
  const payload = Buffer.from(JSON.stringify({ ...session, expires: Date.now() + WEEK * 1000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, // page scripts cannot read it
    sameSite: "lax", // not sent with requests made by other websites
    secure: process.env.NODE_ENV === "production", // https only once hosted
    path: "/",
    maxAge: WEEK,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** Who is logged in, or null. A cookie with a wrong signature or past its date counts as nobody. */
export async function getSession(): Promise<Session | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !sameText(signature, sign(payload))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (session.expires < Date.now()) return null;
    if (session.role !== "admin" && session.role !== "client") return null;
    return session;
  } catch {
    return null;
  }
}

/** For pages: the logged-in user, or go to the login page */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
