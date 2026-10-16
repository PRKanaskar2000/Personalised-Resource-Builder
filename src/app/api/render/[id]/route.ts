import { NextResponse } from "next/server";
import { embedButton } from "@/lib/button-style";
import { getConnector } from "@/lib/connectors";
import { fundraiserFromValues, withDerivedValues, withSampleCustomFields } from "@/lib/personalisation";
import { designToSvg } from "@/lib/render/svg";
import { passesRules } from "@/lib/rules";
import { addView, getEvent, getResource } from "@/lib/store";
import type { AppSettings, NormalisedFundraiser, ResourceRecord } from "@/lib/types";
import { pageAddress, visitorOf } from "@/lib/visitor";

// The finished image of a resource. This is the one part of the app that is open to everyone:
// fundraising pages show resources to visitors who are not logged in here.
// It only ever returns the image of the resource whose id was asked for.

type Context = { params: Promise<{ id: string }> };

// Lets the embed script call this from a fundraising page on another website
const CORS = { "Access-Control-Allow-Origin": "*" };

// The resource and its event's settings, or null if there is no such resource
async function load(id: string): Promise<{ resource: ResourceRecord; settings: AppSettings } | null> {
  const resource = await getResource(id);
  const event = resource && (await getEvent(resource.eventId));
  return resource && event ? { resource, settings: event.settings } : null;
}

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });

function svgResponse(svg: string) {
  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=60", ...CORS },
  });
}

// The values sent by a fundraising page must be one JSON object
function readObject(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

// GET /api/render/<id>: the resource with the dummy values, as the editor shows it
export async function GET(_: Request, { params }: Context) {
  const found = await load((await params).id);
  if (!found) return notFound();
  const sample = (await getConnector().listFundraisers())[0];
  const person = sample ? withDerivedValues(withSampleCustomFields(sample, found.settings), found.settings) : null;
  return svgResponse(await designToSvg(found.resource.design, person));
}

// POST /api/render/<id>                 body = the page's values  -> the image (older embed scripts)
// POST /api/render/<id>?embed=1         body = { values?, fundraiser?, page }  -> JSON for the embed script:
//    { show: false }                    the post's conditional logic hides it for this member
//    { show: true, svg, button }        the image, and the look of its Download button
// Each post that is shown counts as one view.
export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const body = readObject(await request.text());
  if (!body) return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400, headers: CORS });
  const found = await load(id);
  if (!found) return notFound();
  const { resource, settings } = found;
  const embed = new URL(request.url).searchParams.has("embed");

  // Whose values to show: the page's own values, or a fundraiser id looked up on the connected platform
  let person: NormalisedFundraiser | null;
  if (!embed) person = fundraiserFromValues(body);
  else if (body.values && typeof body.values === "object") person = fundraiserFromValues(body.values as Record<string, unknown>);
  else person = await getConnector().getFundraiser(String(body.fundraiser ?? ""));
  // Add the values the app works out itself (progress, impact), using the event's settings
  person = person && withDerivedValues(person, settings);

  const svg = await designToSvg(resource.design, person);
  if (!embed) return svgResponse(svg);

  if (!passesRules(resource.design.show, person)) return NextResponse.json({ show: false }, { headers: CORS });
  await addView({
    resourceId: resource.id,
    url: pageAddress(body.page),
    memberId: person?.individual?.id ? String(person.individual.id).slice(0, 100) : undefined,
    device: visitorOf(request).device,
  });
  return NextResponse.json({ show: true, svg, button: embedButton(resource.design) }, { headers: CORS });
}
