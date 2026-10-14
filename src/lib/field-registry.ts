import type { FieldDefinition } from "./types";

// Every dynamic field a design can use, and where its value comes from on Funraisin.
//  - path:        our own name for the value, used in templates as {{path}}
//  - funraisin:   the PHP expression that gives the value. It uses the $rb… variables that the
//                 embed code sets up by reading the Funraisin database (see embed-code.ts).
//  - needs:       which of those database lookups the expression relies on
//  - derivedFrom: for values the app works out itself (progress, calls answered),
//                 the fields it is calculated from; only those are fetched from Funraisin
// Not listed here, but they work in any text:
//  - custom variables (managed in the settings):  {{custom.field_name}}
//  - impact units from the settings (calls, nights…):  {{impact.key}} and {{teamImpact.key}}
export const FIELD_REGISTRY: FieldDefinition[] = [
  // ---- Member (tables: members + members_history) ----
  { path: "individual.id", label: "Member ID", category: "Member", format: "plain", kind: "text",
    funraisin: "strval($rbMemberId)" },
  // "User name" is the first name, as on the site's own personalised tiles
  { path: "individual.firstName", label: "User name", category: "Member", format: "plain", kind: "text",
    funraisin: '$rbText($rbMember["m_fname"] ?? "")' },
  { path: "individual.fullName", label: "Full name", category: "Member", format: "plain", kind: "text",
    funraisin: '$rbText(($rbMember["m_fname"] ?? "") . " " . ($rbMember["m_lname"] ?? ""))' },
  { path: "individual.lastName", label: "Last name", category: "Member", format: "plain", kind: "text",
    funraisin: '$rbText($rbMember["m_lname"] ?? "")' },
  { path: "individual.profileImage", label: "User photo", category: "Member", format: "plain", kind: "image",
    funraisin: '!empty($rbMember["m_event_photo"]) ? $rbMember["m_event_photo"] : ($rbMember["m_photo"] ?? "")' },

  // ---- Member donations ----
  { path: "fundraising.goal", label: "Goal", category: "Donations", format: "currency", kind: "number",
    funraisin: 'floatval($rbMember["m_target"] ?? 0)' },
  { path: "fundraising.amountRaised", label: "Amount raised", category: "Donations", format: "currency", kind: "number",
    funraisin: "$rbRaised", needs: ["raised"] },
  { path: "fundraising.progress", label: "Progress", category: "Donations", format: "percent", kind: "number",
    derivedFrom: ["fundraising.amountRaised", "fundraising.goal"] },

  // ---- Member fitness ----
  { path: "activity.type", label: "Chosen activity", category: "Fitness", format: "plain", kind: "text",
    funraisin: '$rbText($chosen_activity ?? "")' },
  { path: "activity.targetDistanceKm", label: "Target distance", category: "Fitness", format: "distance", kind: "number",
    funraisin: 'floatval($rbMember["m_target_distance"] ?? 0)' },
  { path: "activity.distanceKm", label: "Distance completed", category: "Fitness", format: "distance", kind: "number",
    funraisin: 'floatval($rbMember["total_distance"] ?? 0)' },
  { path: "activity.progress", label: "Distance progress", category: "Fitness", format: "percent", kind: "number",
    derivedFrom: ["activity.distanceKm", "activity.targetDistanceKm"] },

  // ---- Team (table: teams) ----
  { path: "team.name", label: "Team name", category: "Team", format: "plain", kind: "text",
    funraisin: '$rbText($rbTeam["t_name"] ?? "")', needs: ["team"] },
  { path: "team.goal", label: "Team goal", category: "Team", format: "currency", kind: "number",
    funraisin: 'floatval($rbTeam["t_target"] ?? 0)', needs: ["team"] },
  { path: "team.amountRaised", label: "Team raised", category: "Team", format: "currency", kind: "number",
    funraisin: "$rbTeamRaised", needs: ["teamRaised"] },
  { path: "team.progress", label: "Team progress", category: "Team", format: "percent", kind: "number",
    derivedFrom: ["team.amountRaised", "team.goal"] },
  { path: "team.distanceKm", label: "Team distance", category: "Team", format: "distance", kind: "number",
    funraisin: "$rbTeamDistance", needs: ["teamDistance"] },

  // ---- Organisation (table: organisations) ----
  { path: "organisation.name", label: "Organisation name", category: "Organisation", format: "plain", kind: "text",
    funraisin: '$rbText($rbOrg["org_name"] ?? "")', needs: ["organisation"] },
];

// Older names some designs still use. They work, but are not offered in the editor's field list.
// ("Calls answered" is now an impact unit from the settings: {{impact.calls}}.)
const OLDER_NAMES: FieldDefinition[] = [
  { path: "fundraising.callsAnswered", label: "Calls answered", category: "Donations", format: "plain", kind: "number",
    derivedFrom: ["fundraising.amountRaised"] },
  { path: "team.callsAnswered", label: "Team calls answered", category: "Team", format: "plain", kind: "number",
    derivedFrom: ["team.amountRaised"] },
  { path: "relationship.supporting", label: "Connection", category: "Custom", format: "plain", kind: "text",
    funraisin: '$rbCustom("walking_support")', needs: ["custom"] },
];

export const TEXT_FIELDS = FIELD_REGISTRY.filter((field) => field.kind !== "image");
export const IMAGE_FIELDS = FIELD_REGISTRY.filter((field) => field.kind === "image");
export const FIELD_BY_PATH = new Map([...FIELD_REGISTRY, ...OLDER_NAMES].map((field) => [field.path, field]));
