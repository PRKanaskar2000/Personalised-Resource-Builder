import { NextResponse } from "next/server";
import { badRequest, notFound, notLoggedIn } from "@/lib/access";
import { adminUsername, getSession, hashPassword } from "@/lib/auth";
import { createClient, findClientLogin } from "@/lib/store";

// POST /api/clients with { name, username, password }: create a client. Admin only.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return notLoggedIn();
  if (session.role !== "admin") return notFound();

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim().slice(0, 80);
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name) return badRequest("Enter the client's name");
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return badRequest("Username: 3 to 40 characters, using letters, numbers, dot, dash or underscore");
  }
  if (password.length < 8) return badRequest("Password: at least 8 characters");
  if (username === adminUsername() || (await findClientLogin(username))) {
    return badRequest("That username is already taken");
  }

  return NextResponse.json(await createClient(name, username, hashPassword(password)));
}
