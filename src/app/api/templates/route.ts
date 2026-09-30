import { NextResponse } from "next/server";
import { listTemplates } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await listTemplates());
}
