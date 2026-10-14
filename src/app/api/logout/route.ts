import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";

// POST /api/logout: forget who is logged in
export async function POST() {
  await endSession();
  return NextResponse.json({ ok: true });
}
