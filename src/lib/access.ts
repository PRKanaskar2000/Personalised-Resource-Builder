import { NextResponse } from "next/server";
import type { Session } from "./auth";
import { getAsset, getEvent, getResource } from "./store";
import type { AssetRecord, EventRecord, ResourceRecord } from "./types";

// Who may open what. Every page and API route asks here, so the rule lives in one place:
//   - the admin may open every client
//   - a client may open only their own client, and so only their own events, resources and images
// Something a user may not open is answered exactly like something that does not exist,
// so nobody can find out what other clients have.

export const canUseClient = (session: Session, clientId: string) =>
  session.role === "admin" || (session.role === "client" && session.clientId === clientId);

/** The event, if it exists and this user may open it */
export async function eventFor(session: Session, eventId: string): Promise<EventRecord | null> {
  const event = await getEvent(eventId);
  return event && canUseClient(session, event.clientId) ? event : null;
}

/** The resource and its event, if it exists and this user may open it */
export async function resourceFor(
  session: Session,
  resourceId: string,
): Promise<{ resource: ResourceRecord; event: EventRecord } | null> {
  const resource = await getResource(resourceId);
  const event = resource && (await eventFor(session, resource.eventId));
  return resource && event ? { resource, event } : null;
}

/** The uploaded image, if it exists and this user may open it */
export async function assetFor(session: Session, assetId: string): Promise<AssetRecord | null> {
  const asset = await getAsset(assetId);
  return asset && (await eventFor(session, asset.eventId)) ? asset : null;
}

// Standard answers for API routes
export const notLoggedIn = () => NextResponse.json({ error: "Please log in" }, { status: 401 });
export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
export const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });
