import { NextResponse } from "next/server";
import { eventFor, notFound, notLoggedIn } from "@/lib/access";
import { getSession } from "@/lib/auth";
import { createResource, uniqueResourceName } from "@/lib/store";

// POST /api/resources with { eventId, name }: create a resource in an event, from the default design.
// A name already used in the event gets a number: "Poster", "Poster 1", "Poster 2"…
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return notLoggedIn();
  const body = (await request.json().catch(() => ({}))) as { eventId?: unknown; name?: unknown };
  const event = await eventFor(session, String(body.eventId ?? ""));
  if (!event) return notFound();
  const name = String(body.name ?? "").trim().slice(0, 80) || "Untitled resource";
  return NextResponse.json(await createResource(event.id, await uniqueResourceName(event.id, name)));
}
