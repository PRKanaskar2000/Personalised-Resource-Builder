import { NextResponse } from "next/server";
import { badRequest, canUseClient, notFound, notLoggedIn } from "@/lib/access";
import { getSession } from "@/lib/auth";
import { createEvent, getClient } from "@/lib/store";

// POST /api/events with { clientId, name }: create an event (a folder) for a client.
// A client can only create events for themselves; the admin can for any client.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return notLoggedIn();

  const body = (await request.json().catch(() => ({}))) as { clientId?: unknown; name?: unknown };
  const clientId = String(body.clientId ?? "");
  const name = String(body.name ?? "").trim().slice(0, 80);
  if (!canUseClient(session, clientId) || !(await getClient(clientId))) return notFound();
  if (!name) return badRequest("Enter a name for the event");

  return NextResponse.json(await createEvent(clientId, name));
}
