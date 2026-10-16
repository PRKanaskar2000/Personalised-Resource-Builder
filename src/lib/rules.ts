import { FIELD_BY_PATH, IMAGE_FIELDS, TEXT_FIELDS } from "./field-registry";
import { getFieldValue, isEmptyValue } from "./personalisation";
import type { AppSettings, NormalisedFundraiser, RuleOperator, ShowRule, ShowRules } from "./types";

// Conditional logic: decides whether a post is shown to a member on a fundraising page.
// Examples:  Team name  has a value          -> only members in a team see the team post
//            Amount raised  is empty          -> only members with no donations yet
//            Distance completed  is more than 0
// The check runs on the server (api/render) with the member's values, and in the editor with the sample.

export const RULE_OPERATORS: { value: RuleOperator; label: string; needsValue: boolean }[] = [
  { value: "filled", label: "has a value", needsValue: false },
  { value: "empty", label: "is empty (or 0)", needsValue: false },
  { value: "gt", label: "is more than", needsValue: true },
  { value: "gte", label: "is at least", needsValue: true },
  { value: "lt", label: "is less than", needsValue: true },
  { value: "lte", label: "is at most", needsValue: true },
  { value: "eq", label: "is equal to", needsValue: true },
  { value: "neq", label: "is not equal to", needsValue: true },
];

export const NO_RULES: ShowRules = { enabled: false, match: "all", rules: [] };

/** The fields a rule can check, in groups for the editor's menu */
export function ruleFields(settings: AppSettings): { path: string; label: string; category: string }[] {
  return [
    ...[...TEXT_FIELDS, ...IMAGE_FIELDS].map(({ path, label, category }) => ({ path, label, category })),
    ...settings.impacts.flatMap((unit) => [
      { path: `impact.${unit.key}`, label: unit.name, category: "Impact" },
      { path: `teamImpact.${unit.key}`, label: `Team ${unit.name.toLowerCase()}`, category: "Impact" },
    ]),
    ...settings.customFields.map((field) => ({ path: `custom.${field.key}`, label: field.label, category: "Custom" })),
  ];
}

/** Is this a percentage field (progress)? Its rule value is typed as a percentage: 50 means 50% */
export const isPercentField = (path: string) => FIELD_BY_PATH.get(path)?.format === "percent";

// "$1,250" -> 1250, "12 km" -> 12, "" -> NaN
function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const text = String(value ?? "").replace(/[^0-9.-]/g, "");
  return text === "" ? NaN : Number(text);
}

// No value, empty text or the number 0 all count as empty: no team name, no photo, nothing raised
function isBlank(value: unknown): boolean {
  const text = isEmptyValue(value) ? "" : String(value).trim();
  return text === "" || (typeof value === "number" && value === 0) || text === "0";
}

function ruleIsTrue(rule: ShowRule, fundraiser: NormalisedFundraiser): boolean {
  const value = getFieldValue(fundraiser, rule.field);
  if (rule.operator === "filled") return !isBlank(value);
  if (rule.operator === "empty") return isBlank(value);

  const typed = (rule.value ?? "").trim();
  // A missing number counts as 0; a progress value (0 to 1) is compared as a percentage
  let actual = isEmptyValue(value) ? 0 : toNumber(value);
  if (isPercentField(rule.field)) actual *= 100;
  const wanted = toNumber(typed);

  if (rule.operator === "eq" || rule.operator === "neq") {
    // Numbers are compared as numbers (12 = 12.0); anything else as text, ignoring upper/lower case
    const same =
      !Number.isNaN(actual) && !Number.isNaN(wanted) && typed !== ""
        ? actual === wanted
        : String(value ?? "").trim().toLowerCase() === typed.toLowerCase();
    return rule.operator === "eq" ? same : !same;
  }
  if (Number.isNaN(actual) || Number.isNaN(wanted)) return false;
  if (rule.operator === "gt") return actual > wanted;
  if (rule.operator === "gte") return actual >= wanted;
  if (rule.operator === "lt") return actual < wanted;
  return actual <= wanted; // lte
}

/** Should this post be shown for this member? Always yes when conditional logic is off or has no rules. */
export function passesRules(show: ShowRules | undefined, fundraiser: NormalisedFundraiser | null | undefined): boolean {
  const rules = show?.enabled ? show.rules.filter((rule) => rule.field) : [];
  if (rules.length === 0 || !fundraiser) return true;
  const results = rules.map((rule) => ruleIsTrue(rule, fundraiser));
  return show?.match === "any" ? results.some(Boolean) : results.every(Boolean);
}
