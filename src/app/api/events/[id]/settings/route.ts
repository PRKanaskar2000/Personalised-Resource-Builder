import { NextResponse } from "next/server";
import { eventFor, notFound, notLoggedIn } from "@/lib/access";
import { getSession } from "@/lib/auth";
import { renameFields, saveSettings } from "@/lib/store";
import type { CustomField, ImpactUnit } from "@/lib/types";

// "Nights of care" -> "nights_of_care": the variable name made from a row's name
const toKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const fail = (error: string) => NextResponse.json({ error }, { status: 400 });

/**
 * PUT /api/events/<id>/settings with { impacts: [{ key?, name, amount }], customFields: [{ key?, name, label }] }.
 * `key` is the variable name a row had before this save (empty for a new row). When a row's
 * variable name changes, every design of this event that uses the old one is updated to the new one.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return notLoggedIn();
  const event = await eventFor(session, (await params).id);
  if (!event) return notFound();

  const body = (await request.json()) as { impacts?: unknown; customFields?: unknown };
  if (!Array.isArray(body.impacts) || !Array.isArray(body.customFields)) return fail("Send impacts and customFields");
  if (body.impacts.length > 30 || body.customFields.length > 60) return fail("Too many rows");

  const renames: Record<string, string> = {};

  // Impact units: the variable name always follows the name ("Nights" -> impact.nights)
  const impacts: ImpactUnit[] = [];
  for (const item of body.impacts as Record<string, unknown>[]) {
    const name = String(item?.name ?? "").trim().slice(0, 40);
    const amount = Number(item?.amount);
    const key = toKey(name);
    if (!name) return fail("Every impact row needs a name");
    if (!key) return fail(`"${name}" needs letters or numbers in its name`);
    if (!Number.isFinite(amount) || amount <= 0) return fail(`"${name}" needs an amount above 0`);
    if (impacts.some((unit) => unit.key === key)) return fail(`Two impact rows are both called "${name}"`);
    impacts.push({ key, name, amount });
    const before = String(item.key ?? "");
    if (before && before !== key) {
      renames[`impact.${before}`] = `impact.${key}`;
      renames[`teamImpact.${before}`] = `teamImpact.${key}`;
    }
  }

  // Custom variables: the variable name is the platform's own field name, typed as it is stored there
  const customFields: CustomField[] = [];
  for (const item of body.customFields as Record<string, unknown>[]) {
    const key = String(item?.name ?? "").trim();
    const label = String(item?.label ?? "").trim().slice(0, 40) || key;
    if (!key) return fail("Every custom variable needs a variable name");
    if (!/^[A-Za-z0-9_]{1,60}$/.test(key)) return fail(`"${key}" can only have letters, numbers and _`);
    if (customFields.some((field) => field.key === key)) return fail(`"${key}" is listed twice`);
    customFields.push({ key, label });
    const before = String(item.key ?? "");
    if (before && before !== key) renames[`custom.${before}`] = `custom.${key}`;
  }

  await renameFields(event.id, renames);
  return NextResponse.json(await saveSettings(event.id, { impacts, customFields }));
}
