import { NextResponse } from "next/server";
import { badRequest, eventFor, notFound, notLoggedIn } from "@/lib/access";
import { getSession } from "@/lib/auth";
import { addAsset } from "@/lib/store";

const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

// POST /api/assets (a form with `file` and `eventId`): upload an image into an event's library
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return notLoggedIn();

  const form = await request.formData();
  const event = await eventFor(session, String(form.get("eventId") ?? ""));
  if (!event) return notFound();

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("Choose an image to upload");
  if (!IMAGE_TYPES.includes(file.type)) return badRequest("Use a PNG, JPG, GIF, WebP or SVG image");
  if (file.size > MAX_BYTES) return badRequest("The image is larger than 10 MB");

  const asset = await addAsset(event.id, {
    name: file.name,
    type: file.type,
    bytes: Buffer.from(await file.arrayBuffer()),
  });
  return NextResponse.json(asset);
}
