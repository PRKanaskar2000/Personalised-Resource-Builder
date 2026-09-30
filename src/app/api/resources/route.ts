import { NextResponse } from "next/server";
import { createResource, listResources, listTemplates } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await listResources());
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; templateId?: string };
  const templates = await listTemplates();
  const template = templates.find((row) => row.id === body.templateId);
  const resource = await createResource(body.name || "Untitled resource", template);
  return NextResponse.json(resource);
}
