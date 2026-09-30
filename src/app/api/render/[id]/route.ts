import { NextResponse } from "next/server";
import { getConnector } from "@/lib/connectors";
import { designToSvg } from "@/lib/render/svg";
import { getResource } from "@/lib/store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await getResource(id);
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = new URL(request.url);
  const fundraiserId = url.searchParams.get("fundraiser") ?? "peter";
  const fundraiser = await getConnector().getFundraiser(fundraiserId);
  const svg = designToSvg(resource.design, fundraiser);
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
