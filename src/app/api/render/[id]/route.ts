import { NextResponse } from "next/server";
import { getConnector } from "@/lib/connectors";
import { fundraiserFromValues, withDerivedValues, withSampleCustomFields } from "@/lib/personalisation";
import { designToSvg } from "@/lib/render/svg";
import { getEvent, getResource } from "@/lib/store";
import type { AppSettings, NormalisedFundraiser } from "@/lib/types";

// The finished image of a resource. This is the one part of the app that is open to everyone:
// fundraising pages show resources to visitors who are not logged in here.
// It only ever returns the image of the resource whose id was asked for.

type Context = { params: Promise<{ id: string }> };

// `personFor` is given the event's settings and returns whose values to show
async function render(id: string, personFor: (settings: AppSettings) => Promise<NormalisedFundraiser | null>) {
  const resource = await getResource(id);
  const event = resource && (await getEvent(resource.eventId));
  if (!resource || !event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const person = await personFor(event.settings);
  // Add the values the app works out itself (progress, impact), using the event's settings
  const svg = await designToSvg(resource.design, person && withDerivedValues(person, event.settings));
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      // Lets the embed script call this from a fundraising page on another website
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// GET /api/render/<id>: the resource with the dummy values, as the editor shows it
export async function GET(_: Request, { params }: Context) {
  return render((await params).id, async (settings) => {
    const sample = (await getConnector().listFundraisers())[0];
    return sample ? withSampleCustomFields(sample, settings) : null;
  });
}

// POST /api/render/<id>: values come from the page itself (the data-values of the embed),
// e.g. { "individual.fullName": "Asha Verma", "fundraising.amountRaised": 3275 }
export async function POST(request: Request, { params }: Context) {
  let values: unknown;
  try {
    values = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  return render((await params).id, async () => fundraiserFromValues(values as Record<string, unknown>));
}
