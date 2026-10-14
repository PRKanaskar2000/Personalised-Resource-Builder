import { FIELD_BY_PATH } from "./field-registry";
import type { AppSettings, FieldFormat, NormalisedFundraiser } from "./types";

// Currency used when an embed does not send one
const DEFAULT_CURRENCY = "AUD";

function readPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in (value as object)) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

export function getFieldValue(fundraiser: NormalisedFundraiser, path: string): unknown {
  return readPath(fundraiser, path);
}

export function formatValue(value: unknown, format: FieldFormat = "plain", currency = "AUD"): string {
  if (value === undefined || value === null || value === "") return "";
  if (format === "currency" && typeof value === "number") {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (format === "percent" && typeof value === "number") {
    return `${Math.round(value * 100)}%`;
  }
  if (format === "distance" && typeof value === "number") {
    return `${value} km`;
  }
  if (format === "date" && typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
    }
  }
  return String(value);
}

const TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;

/** Replace every {{field}} in the text with the fundraiser's value */
export function resolveFields(template: string, fundraiser: NormalisedFundraiser, format: FieldFormat = "plain"): string {
  return template.replace(TOKEN, (_, path: string) => {
    const trimmed = path.trim();
    // Use the format from the field list (currency, percent…); guess only for unknown fields
    const fieldFormat = format === "plain" ? (FIELD_BY_PATH.get(trimmed)?.format ?? guessFormat(trimmed)) : format;
    return formatValue(getFieldValue(fundraiser, trimmed), fieldFormat, fundraiser.fundraising.currency);
  });
}

/** Every field path a template uses: "Hi {{individual.firstName}}" -> ["individual.firstName"] */
export function templateFields(template: string): string[] {
  return [...template.matchAll(TOKEN)].map((match) => match[1].trim());
}

/**
 * Build a fundraiser from the flat values an embed sends, e.g.
 * { "individual.fullName": "Peter Walsh", "custom.walking_reason": "For Sarah" }.
 * Only "section.field" keys of the known sections are accepted.
 */
export function fundraiserFromValues(values: Record<string, unknown>): NormalisedFundraiser {
  const sections: Record<string, Record<string, unknown>> = {
    individual: {},
    fundraising: { currency: DEFAULT_CURRENCY },
    story: {},
    relationship: {},
    activity: {},
    team: {},
    organisation: {},
    event: {},
    custom: {},
    impact: {},
    teamImpact: {},
  };
  for (const [path, value] of Object.entries(values)) {
    const [section, field, ...rest] = path.split(".");
    const isSimple = typeof value === "string" || typeof value === "number";
    if (rest.length === 0 && field && isSimple && Object.hasOwn(sections, section)) {
      sections[section][field] = value;
    }
  }
  return sections as unknown as NormalisedFundraiser;
}

function guessFormat(path: string): FieldFormat {
  if (path.includes("progress")) return "percent";
  if (path.includes("goal") || path.includes("amountRaised")) return "currency";
  if (path.toLowerCase().includes("distance")) return "distance";
  if (path.toLowerCase().includes("date")) return "date";
  return "plain";
}

/**
 * Add the values the app works out itself, so they never have to be sent by the fundraising page.
 *  - impact         = amount raised / the amount of one unit, rounded down (650 raised at 39 a call = 16 calls)
 *  - progress       = raised / goal, or distance / target distance, between 0 and 1
 */
export function withDerivedValues(fundraiser: NormalisedFundraiser, settings: AppSettings): NormalisedFundraiser {
  const number = (value: unknown) => Number(value) || 0;
  // For each impact unit in the settings: amount raised / its amount, rounded down
  const impactOf = (raised: unknown) =>
    Object.fromEntries(
      settings.impacts.map((unit) => [unit.key, unit.amount > 0 ? Math.floor(number(raised) / unit.amount) : 0]),
    );
  const impact = impactOf(fundraiser.fundraising.amountRaised);
  const teamImpact = impactOf(fundraiser.team.amountRaised);
  // Older designs use "calls answered": the unit called calls, or else the first unit
  const firstKey = settings.impacts.some((unit) => unit.key === "calls") ? "calls" : settings.impacts[0]?.key;
  // If there is no goal to measure against, keep any progress that was already given
  const share = (part: unknown, whole: unknown, fallback: unknown) =>
    number(whole) > 0 ? Math.min(1, Math.max(0, number(part) / number(whole))) : number(fallback);

  const { fundraising, activity, team } = fundraiser;
  return {
    ...fundraiser,
    impact,
    teamImpact,
    fundraising: {
      ...fundraising,
      callsAnswered: firstKey ? impact[firstKey] : 0,
      progress: share(fundraising.amountRaised, fundraising.goal, fundraising.progress),
    },
    activity: { ...activity, progress: share(activity.distanceKm, activity.targetDistanceKm, activity.progress) },
    team: {
      ...team,
      callsAnswered: firstKey ? teamImpact[firstKey] : 0,
      progress: share(team.amountRaised, team.goal, team.progress),
    },
  };
}

/**
 * For the dummy data only: give every custom variable from the settings its label as a value,
 * so "{{custom.walking_support}}" shows as "Connection" on the canvas.
 */
export function withSampleCustomFields(fundraiser: NormalisedFundraiser, settings: AppSettings): NormalisedFundraiser {
  const labels = Object.fromEntries(settings.customFields.map((field) => [field.key, field.label]));
  return { ...fundraiser, custom: { ...labels, ...fundraiser.custom } };
}

export function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}
