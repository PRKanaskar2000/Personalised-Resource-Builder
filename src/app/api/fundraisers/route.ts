import { NextResponse } from "next/server";
import { getConnector } from "@/lib/connectors";

export async function GET() {
  const fundraisers = await getConnector().listFundraisers();
  return NextResponse.json(fundraisers);
}
