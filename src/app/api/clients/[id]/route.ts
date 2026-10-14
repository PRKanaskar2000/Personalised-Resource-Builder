import { NextResponse } from "next/server";
import { badRequest, notFound, notLoggedIn } from "@/lib/access";
import { adminUsername, getSession, hashPassword } from "@/lib/auth";
import { deleteClient, findClientLogin, getClient, updateClient } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

// Both of these are for the admin only
async function adminClient(id: string) {
  const session = await getSession();
  if (!session) return { error: notLoggedIn() };
  if (session.role !== "admin") return { error: notFound() };
  const client = await getClient(id);
  return client ? { client } : { error: notFound() };
}

// PATCH /api/clients/<id> with { name, username, password }: change the client's details.
// An empty password means "keep the current password".
export async function PATCH(request: Request, { params }: Context) {
  const { client, error } = await adminClient((await params).id);
  if (!client) return error;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? client.name).trim().slice(0, 80);
  const username = String(body.username ?? client.username).trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name) return badRequest("Enter the client's name");
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return badRequest("Username: 3 to 40 characters, using letters, numbers, dot, dash or underscore");
  }
  if (password && password.length < 8) return badRequest("Password: at least 8 characters");
  if (username !== client.username && (username === adminUsername() || (await findClientLogin(username)))) {
    return badRequest("That username is already taken");
  }

  const changes = password ? { name, username, passwordHash: hashPassword(password) } : { name, username };
  return NextResponse.json(await updateClient(client.id, changes));
}

// DELETE /api/clients/<id>: remove the client with all their events and resources
export async function DELETE(_: Request, { params }: Context) {
  const { client, error } = await adminClient((await params).id);
  if (!client) return error;
  await deleteClient(client.id);
  return NextResponse.json({ ok: true });
}
