import { NextResponse } from "next/server";
import { notFound, notLoggedIn, resourceFor } from "@/lib/access";
import { getSession } from "@/lib/auth";
import { getConnector } from "@/lib/connectors";
import { DOWNLOAD_FORMATS } from "@/lib/download";
import { addDownload, getResource, listDownloads } from "@/lib/store";
import { pageAddress, visitorOf } from "@/lib/visitor";

type Context = { params: Promise<{ id: string }> };

// Lets the embed script on a fundraising page (another website) report a download
const CORS = { "Access-Control-Allow-Origin": "*" };

// Keep a short piece of plain text from the request, or nothing
function shortText(value: unknown) {
  const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  return text ? text.slice(0, 100) : undefined;
}

// GET /api/downloads/<resource id>: the total, the count for each page address, and every download.
// The history holds member names, so only a logged-in user who may open the resource can read it.
export async function GET(_: Request, { params }: Context) {
  const session = await getSession();
  if (!session) return notLoggedIn();
  const found = await resourceFor(session, (await params).id);
  if (!found) return notFound();
  const downloads = await listDownloads(found.resource.id);

  const pages = new Map<string, { url: string; count: number }>();
  for (const download of downloads) {
    const page = pages.get(download.url) ?? { url: download.url, count: 0 };
    page.count += 1;
    pages.set(download.url, page);
  }

  return NextResponse.json({
    total: downloads.length,
    pages: [...pages.values()].sort((a, b) => b.count - a.count),
    downloads: [...downloads].reverse(), // newest first
  });
}

// POST /api/downloads/<resource id> with { url, format, memberId?, memberName? }: record one download,
// with the visitor's device, IP address and user agent.
// Open to everyone, because it is called from fundraising pages by people who are not logged in here.
export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  if (!(await getResource(id))) return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400, headers: CORS });
  }

  // Keep only the page address (no ?query or #hash, which can hold personal details)
  const url = pageAddress(body.url);
  if (!url) return NextResponse.json({ error: "url must be a web address" }, { status: 400, headers: CORS });
  const format = DOWNLOAD_FORMATS.find((item) => item === body.format);
  if (!format) return NextResponse.json({ error: "Unknown format" }, { status: 400, headers: CORS });

  // If the page sent only an id, look the name up from the connected platform
  const memberId = shortText(body.memberId);
  let memberName = shortText(body.memberName);
  if (memberId && !memberName) {
    memberName = (await getConnector().getFundraiser(memberId))?.individual.fullName;
  }

  // Device, IP address and user agent of the browser that downloaded it
  await addDownload({ resourceId: id, url, format, at: new Date().toISOString(), memberId, memberName, ...visitorOf(request) });
  return NextResponse.json({ ok: true }, { headers: CORS });
}
