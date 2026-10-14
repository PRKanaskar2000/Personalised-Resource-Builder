import { NextResponse } from "next/server";
import { notFound, notLoggedIn, resourceFor } from "@/lib/access";
import { getSession } from "@/lib/auth";
import { cloneDesign } from "@/lib/design";
import { deleteResource, saveResource, uniqueResourceName } from "@/lib/store";
import type { DesignDocument } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };

// The resource, if the logged-in user may open it; otherwise the answer to send back
async function allowedResource(id: string) {
  const session = await getSession();
  if (!session) return { error: notLoggedIn() };
  const found = await resourceFor(session, id);
  return found ? { resource: found.resource } : { error: notFound() };
}

export async function GET(_: Request, { params }: Context) {
  const { resource, error } = await allowedResource((await params).id);
  return resource ? NextResponse.json(resource) : error;
}

export async function DELETE(_: Request, { params }: Context) {
  const { resource, error } = await allowedResource((await params).id);
  if (!resource) return error;
  await deleteResource(resource.id);
  return NextResponse.json({ ok: true });
}

// PUT /api/resources/<id> with { name?, design? }: save changes, keeping the last 20 versions.
// A new name already used by another resource of the event gets a number: "Poster 1", "Poster 2"…
export async function PUT(request: Request, { params }: Context) {
  const { resource, error } = await allowedResource((await params).id);
  if (!resource) return error;
  const body = (await request.json()) as { name?: string; design?: DesignDocument };
  const now = new Date().toISOString();
  const typed = String(body.name ?? "").trim().slice(0, 80) || resource.name;
  const name = typed === resource.name ? typed : await uniqueResourceName(resource.eventId, typed, resource.id);
  const next = {
    ...resource,
    name,
    design: body.design ? cloneDesign(body.design) : resource.design,
    updatedAt: now,
    versions: body.design
      ? [{ at: now, design: cloneDesign(body.design) }, ...resource.versions].slice(0, 20)
      : resource.versions,
  };
  await saveResource(next);
  return NextResponse.json(next);
}
