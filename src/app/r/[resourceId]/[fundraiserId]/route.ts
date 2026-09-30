import { NextResponse } from "next/server";
import { getConnector } from "@/lib/connectors";
import { designToSvg } from "@/lib/render/svg";
import { getResource } from "@/lib/store";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ resourceId: string; fundraiserId: string }> },
) {
  const { resourceId, fundraiserId } = await params;
  const resource = await getResource(resourceId);
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const fundraiser = await getConnector().getFundraiser(fundraiserId);
  return new NextResponse(designToSvg(resource.design, fundraiser), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
  });
}
