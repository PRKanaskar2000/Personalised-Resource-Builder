import { NextResponse } from "next/server";
import { isAdminLogin, passwordMatches, startSession } from "@/lib/auth";
import { findClientLogin } from "@/lib/store";

// Slow down password guessing: after 5 wrong tries for a username, wait a minute.
// (Kept in memory, so it resets when the app restarts.)
const failures = new Map<string, { count: number; blockedUntil: number }>();
const MAX_TRIES = 5;
const BLOCK_MS = 60_000;

// POST /api/login with { username, password }
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { username?: unknown; password?: unknown };
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!username || !password) return NextResponse.json({ error: "Enter your username and password" }, { status: 400 });

  const record = failures.get(username);
  if (record && record.blockedUntil > Date.now()) {
    return NextResponse.json({ error: "Too many tries. Wait a minute and try again." }, { status: 429 });
  }

  if (isAdminLogin(username, password)) {
    failures.delete(username);
    await startSession({ role: "admin", clientId: "", name: "Admin" });
    return NextResponse.json({ ok: true });
  }

  const login = await findClientLogin(username);
  if (login && passwordMatches(password, login.passwordHash)) {
    failures.delete(username);
    await startSession({ role: "client", clientId: login.client.id, name: login.client.name });
    return NextResponse.json({ ok: true });
  }

  // The same answer whether the username or the password was wrong
  const count = (record?.count ?? 0) + 1;
  failures.set(username, { count, blockedUntil: count >= MAX_TRIES ? Date.now() + BLOCK_MS : 0 });
  if (count >= MAX_TRIES) failures.set(username, { count: 0, blockedUntil: Date.now() + BLOCK_MS });
  return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
}
