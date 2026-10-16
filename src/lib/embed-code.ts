import { FIELD_BY_PATH } from "./field-registry";
import { templateFields } from "./personalisation";
import { sliderStyleAttribute, type SliderNav, type SliderStyle } from "./slider-style";
import type { DesignDocument, FunraisinLookup } from "./types";

export const EMBED_PLATFORMS = [
  { id: "funraisin", label: "Funraisin" },
  { id: "raisely", label: "Raisely" },
] as const;
export type EmbedPlatform = (typeof EMBED_PLATFORMS)[number]["id"];

// Sent with every embed: who the page belongs to (shown in the download list)
export const MEMBER_FIELDS = ["individual.id", "individual.fullName"];

// A custom field is written {{custom.field_name}}; the name must match Funraisin's field_name
const CUSTOM_FIELD = /^custom\.([A-Za-z0-9_]+)$/;

// ---- The PHP that reads the values from the Funraisin database ----
// It loads the member the same way the site's own pages do (SELECT * from members, members_history,
// teams and organisations), so it does not depend on variables that only some pages have.
// Every variable starts with $rb ("resource builder") so nothing on the page is overwritten.
// The generated code has no comments in it; this file is where each part is explained.

// Always included: the logged-in member (tables: members + members_history), and $rbText, which
// tidies a text value and converts it to UTF-8. Without that, one name stored in an older
// encoding makes json_encode() fail and no values reach the resource at all.
const FUNRAISIN_MEMBER = `$rbCI =& get_instance();
$rbCI->load->library('session');
$rbMemberId = intval($rbCI->session->membersession_member_id ?? 0);
$rbHistoryId = intval($rbCI->session->membersession_history_id ?? 0);
$rbMember = $rbMemberId > 0 ? MySQLArray("SELECT * FROM members AS a WHERE a.member_id='" . $rbMemberId . "'") : array();
if (!is_array($rbMember)) $rbMember = array();
$rbHistory = ($rbMemberId > 0 && $rbHistoryId > 0) ? MySQLArray("SELECT * FROM members_history WHERE member_id='" . $rbMemberId . "' AND history_id='" . $rbHistoryId . "'") : array();
if (is_array($rbHistory)) $rbMember = array_merge($rbMember, $rbHistory);
$rbTeamId = intval($rbMember["team_id"] ?? 0);
$rbOrgId = intval($rbMember["org_id"] ?? 0);
$rbText = function ($value) {
  $value = trim(stripslashes((string) $value));
  if ($value === "" || !function_exists('mb_check_encoding') || mb_check_encoding($value, 'UTF-8')) return $value;
  return mb_convert_encoding($value, 'UTF-8', 'Windows-1252');
};`;

// Included only when the design uses a field that needs them:
//   raised        amount the member has raised
//   team          the member's team (table: teams)
//   teamRaised    amount the team has raised
//   teamDistance  target distance of everyone in the team, added up
//   organisation  the member's organisation (table: organisations)
//   custom        one custom field of the member, by its field_name (table: members_custom_fields)
const FUNRAISIN_LOOKUPS: Record<FunraisinLookup, string> = {
  raised: `$rbRaised = $rbHistoryId > 0 ? floatval(GetDonations($rbHistoryId)) : 0;`,
  team: `$rbTeam = $rbTeamId > 0 ? MySQLArray("SELECT * FROM teams WHERE team_id='" . $rbTeamId . "'") : array();
if (!is_array($rbTeam)) $rbTeam = array();`,
  teamRaised: `$rbTeamRaised = $rbTeamId > 0 ? floatval(GetDonations(0, $rbTeamId)) : 0;`,
  teamDistance: `$rbTeamDistance = $rbTeamId > 0 ? floatval(MySQLResult("SELECT SUM(m_target_distance) AS total FROM members_history WHERE team_id='" . $rbTeamId . "' AND is_complete='Y'", "total")) : 0;`,
  organisation: `$rbOrg = $rbOrgId > 0 ? MySQLArray("SELECT * FROM organisations WHERE org_id='" . $rbOrgId . "'") : array();
if (!is_array($rbOrg)) $rbOrg = array();`,
  custom: `$rbCustom = function ($name) use ($rbHistoryId, $rbText) {
  if ($rbHistoryId <= 0) return "";
  return $rbText(MySQLResult("SELECT field_value FROM members_custom_fields WHERE field_name='" . $name . "' AND history_id='" . $rbHistoryId . "'", "field_value"));
};`,
};

/** Every dynamic field the design uses (in its layers and its conditional logic), each listed once */
export function usedFields(design: DesignDocument): string[] {
  const paths = design.layers.flatMap((layer) => {
    if (layer.type === "dynamic-text") return templateFields(layer.template);
    if (layer.type === "dynamic-image" || layer.type === "progress-bar") return [layer.field];
    return [];
  });
  const ruleFields = design.show?.enabled ? design.show.rules.map((rule) => rule.field).filter(Boolean) : [];
  return [...new Set([...paths, ...ruleFields])];
}

/** Custom field names used by the design: ["walking_reason", "walking_support"] */
export function usedCustomFields(design: DesignDocument): string[] {
  return usedFields(design).flatMap((path) => path.match(CUSTOM_FIELD)?.[1] ?? []);
}

// The PHP expression for a field, or nothing if Funraisin has no value for it
function funraisinValue(path: string): string | undefined {
  const known = FIELD_BY_PATH.get(path)?.funraisin;
  if (known) return known;
  // Any other custom field is read by its name
  const custom = path.match(CUSTOM_FIELD);
  return custom ? `$rbCustom("${custom[1]}")` : undefined;
}

// Which database lookups a field needs
function funraisinNeeds(path: string): FunraisinLookup[] {
  return FIELD_BY_PATH.get(path)?.needs ?? (CUSTOM_FIELD.test(path) ? ["custom"] : []);
}

// Impact units from the settings: {{impact.calls}} for the member, {{teamImpact.calls}} for the team
const IMPACT_FIELD = /^impact\.[a-z0-9_]+$/;
const TEAM_IMPACT_FIELD = /^teamImpact\.[a-z0-9_]+$/;

// A value the app works out itself (progress, impact) is not fetched;
// the values it is calculated from are fetched instead
function fetchedFields(path: string): string[] {
  if (IMPACT_FIELD.test(path)) return ["fundraising.amountRaised"];
  if (TEAM_IMPACT_FIELD.test(path)) return ["team.amountRaised"];
  return FIELD_BY_PATH.get(path)?.derivedFrom ?? [path];
}

// The Funraisin PHP that puts the member's values in $resourceValues: only the fields the designs use.
// The member's id and name are always sent, so each download can be listed against the person.
function funraisinValues(designs: DesignDocument[]): string {
  const fields = [...new Set([...MEMBER_FIELDS, ...designs.flatMap(usedFields).flatMap(fetchedFields)])];
  const needed = new Set(fields.flatMap(funraisinNeeds));
  const lookups = (Object.keys(FUNRAISIN_LOOKUPS) as FunraisinLookup[])
    .filter((lookup) => needed.has(lookup))
    .map((lookup) => FUNRAISIN_LOOKUPS[lookup]);
  // A field Funraisin has no value for is simply left out (it shows nothing on the page)
  const lines = fields.flatMap((path) => {
    const value = funraisinValue(path);
    return value ? [`  "${path}" => ${value},`] : [];
  });
  return `<?php
${[FUNRAISIN_MEMBER, ...lookups].join("\n")}
$resourceValues = [
${lines.join("\n")}
];
?>`;
}

// JSON_PARTIAL_OUTPUT_ON_ERROR: if one value still cannot be encoded, the others are sent anyway
const FUNRAISIN_VALUES_ATTRIBUTE = `data-values="<?= htmlspecialchars(json_encode($resourceValues, JSON_PARTIAL_OUTPUT_ON_ERROR), ENT_QUOTES) ?>"`;

// The embed for one post or a slider: `target` is the div's own attributes
function embedBlock(platform: EmbedPlatform, target: string, designs: DesignDocument[], origin: string, sampleFundraiserId: string) {
  const script = `<script src="${origin}/embed.js"></script>`;
  if (platform === "funraisin") {
    return `${funraisinValues(designs)}
<div ${target} ${FUNRAISIN_VALUES_ATTRIBUTE}></div>
${script}`;
  }
  // Raisely: its own variables will be added later. For now it shows one fundraiser by id.
  return `<div ${target} data-fundraiser="${sampleFundraiserId}"></div>
${script}`;
}

/** The code to paste into a fundraising page so it shows this resource */
export function embedCode(
  platform: EmbedPlatform,
  resourceId: string,
  design: DesignDocument,
  origin: string,
  sampleFundraiserId: string,
): string {
  return embedBlock(platform, `data-resource="${resourceId}"`, [design], origin, sampleFundraiserId);
}

/**
 * The code for a slider of several posts. `columns` posts are shown side by side (fewer on phones).
 * `nav` says which controls it has (arrows, dots or both) and `style` how they look.
 * The values are read once, for every field any of the posts needs.
 */
export function sliderEmbedCode(
  platform: EmbedPlatform,
  resources: { id: string; design: DesignDocument }[],
  columns: number,
  nav: SliderNav,
  style: SliderStyle,
  origin: string,
  sampleFundraiserId: string,
): string {
  const css = sliderStyleAttribute(style);
  const target =
    `data-slider="${resources.map((resource) => resource.id).join(",")}" data-columns="${columns}"` +
    (nav === "both" ? "" : ` data-nav="${nav}"`) +
    (style.arrowIcon && nav !== "dots" ? ` data-arrow-icon="${style.arrowIcon}"` : "") +
    (css ? ` style="${css}"` : "");
  return embedBlock(platform, target, resources.map((resource) => resource.design), origin, sampleFundraiserId);
}
