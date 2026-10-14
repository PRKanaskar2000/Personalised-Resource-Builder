import { NextResponse } from "next/server";
import { assetFor, notFound, notLoggedIn } from "@/lib/access";
import { getSession } from "@/lib/auth";
import { deleteAsset } from "@/lib/store";

// DELETE /api/assets/<asset id>: remove an uploaded image, unless a resource still uses it
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return notLoggedIn();
  const asset = await assetFor(session, (await params).id);
  if (!asset) return notFound();

  const result = await deleteAsset(asset);
  if (result.deleted) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: "In use", usedBy: result.usedBy }, { status: 409 });
}
