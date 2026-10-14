import { NextResponse } from "next/server";
import { badRequest, eventFor, notFound, notLoggedIn } from "@/lib/access";
import { getSession } from "@/lib/auth";
import { deleteEvent, renameEvent } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

// PATCH /api/events/<id> with { name }: rename an event
export async function PATCH(request: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return notLoggedIn();
  const event = await eventFor(session, (await params).id);
  if (!event) return notFound();

  const body = (await request.json().catch(() => ({}))) as { name?: unknown };
  const name = String(body.name ?? "").trim().slice(0, 80);
  if (!name) return badRequest("Enter a name for the event");
  return NextResponse.json(await renameEvent(event.id, name));
}

// DELETE /api/events/<id>: remove an event with its resources, images and download history
export async function DELETE(_: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return notLoggedIn();
  const event = await eventFor(session, (await params).id);
  if (!event) return notFound();
  await deleteEvent(event.id);
  return NextResponse.json({ ok: true });
}
