import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { addAsset, listAssets } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await listAssets());
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".png";
  const id = nanoid(10);
  const filename = `${id}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), bytes);
  const asset = await addAsset({
    id: `asset_${id}`,
    name: file.name,
    kind: "upload",
    scope: "organisation",
    mimeType: file.type || "image/png",
    url: `/uploads/${filename}`,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json(asset);
}
