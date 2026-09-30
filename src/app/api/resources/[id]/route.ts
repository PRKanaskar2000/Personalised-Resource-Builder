import { NextResponse } from "next/server";
import { cloneDesign } from "@/lib/design";
import { getResource, saveResource } from "@/lib/store";
import type { DesignDocument } from "@/lib/types";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await getResource(id);
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(resource);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await getResource(id);
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await request.json()) as { name?: string; design?: DesignDocument };
  const next = {
    ...resource,
    name: body.name ?? resource.name,
    design: body.design ? cloneDesign(body.design) : resource.design,
    updatedAt: new Date().toISOString(),
    versions: body.design
      ? [{ at: new Date().toISOString(), design: cloneDesign(body.design) }, ...resource.versions].slice(0, 20)
      : resource.versions,
  };
  await saveResource(next);
  return NextResponse.json(next);
}
