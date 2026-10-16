export type LayerType =
  | "rect"
  | "ellipse"
  | "text"
  | "image"
  | "dynamic-text"
  | "dynamic-image"
  | "progress-bar";

export type TextAlign = "left" | "center" | "right";
export type FieldFormat = "plain" | "currency" | "percent" | "date" | "distance";

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: TextAlign;
  lineHeight: number;
  letterSpacing: number;
  /** Letter case shown, whatever case the text or value was typed in. Missing = as typed */
  textTransform?: LetterCase;
  /** Make the text smaller when it is too long for its box (e.g. a 15-word team name) */
  autoFit?: boolean;
  /** With autoFit: the text never gets smaller than this, in pixels */
  minFontSize?: number;
}

export type LetterCase = "none" | "uppercase" | "lowercase" | "capitalize";

/**
 * A styled part of a text: characters start..end get their own colour, font or weight.
 * The positions count characters in the text exactly as typed (including {{field}} names).
 */
export interface TextRange {
  start: number;
  end: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  textTransform?: LetterCase;
}

export interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  hideIfEmpty?: boolean;
  /** Border drawn inside the layer's edge, in pixels (shapes and images). 0 or missing = none */
  borderWidth?: number;
  borderColor?: string;
}

export interface RectLayer extends BaseLayer {
  type: "rect";
  fill: string;
  radius: number;
}

export interface EllipseLayer extends BaseLayer {
  type: "ellipse";
  fill: string;
}

export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  style: TextStyle;
  ranges?: TextRange[];
}

export interface ImageLayer extends BaseLayer {
  type: "image";
  source: string;
  objectFit: "cover" | "contain";
  radius: number;
}

export interface DynamicTextLayer extends BaseLayer {
  type: "dynamic-text";
  template: string;
  style: TextStyle;
  format?: FieldFormat;
  ranges?: TextRange[];
}

export interface DynamicImageLayer extends BaseLayer {
  type: "dynamic-image";
  field: string;
  fallback?: string;
  objectFit: "cover" | "contain";
  radius: number;
}

export interface ProgressBarLayer extends BaseLayer {
  type: "progress-bar";
  field: string;
  track: string;
  fill: string;
  radius: number;
}

export type Layer =
  | RectLayer
  | EllipseLayer
  | TextLayer
  | ImageLayer
  | DynamicTextLayer
  | DynamicImageLayer
  | ProgressBarLayer;

export interface CanvasConfig {
  width: number;
  height: number;
  background: string;
  /** Optional image shown over the background colour, covering the whole canvas */
  backgroundImage?: string;
}

export interface DesignDocument {
  version: 1;
  canvas: CanvasConfig;
  layers: Layer[];
  /** Conditional logic: when this post is shown on a fundraising page. Missing or off = always */
  show?: ShowRules;
  /** How the Download button under the post looks. Missing or off = the page's own CSS decides */
  button?: ButtonStyle;
}

/**
 * Conditional logic of a post, e.g. "show only when the member has a team".
 * `match`: "all" = every rule must be true, "any" = one true rule is enough.
 */
export interface ShowRules {
  enabled: boolean;
  match: "all" | "any";
  rules: ShowRule[];
}

/** One rule: a field, how to compare it, and (for comparisons) the value to compare with */
export interface ShowRule {
  field: string;
  operator: RuleOperator;
  value?: string;
}

/** filled = has a value; empty = no value (or 0); gt/gte/lt/lte = more/at least/less/at most; eq/neq = equal/not equal */
export type RuleOperator = "filled" | "empty" | "gt" | "gte" | "lt" | "lte" | "eq" | "neq";

/** The look of the Download button under a post on a fundraising page */
export interface ButtonStyle {
  /** Off: the button has no styles of its own and the page's CSS (class PR_resources_Dbtn) decides */
  enabled: boolean;
  text: string;
  /** "" = the page's own font */
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  background: string;
  borderWidth: number;
  borderColor: string;
  radius: number;
  paddingX: number;
  paddingY: number;
  /** auto = as wide as its text, full = the whole width of the post, fixed = `width` pixels */
  widthMode: "auto" | "full" | "fixed";
  width: number;
}

/** A company that logs in. It owns events, and can only ever see its own. */
export interface ClientRecord {
  id: string;
  name: string;
  username: string;
  createdAt: string;
}

/** An event (shown as a folder) belongs to one client and holds resources, images and settings */
export interface EventRecord {
  id: string;
  clientId: string;
  name: string;
  settings: AppSettings;
  createdAt: string;
}

export interface ResourceRecord {
  id: string;
  /** The event this resource belongs to */
  eventId: string;
  name: string;
  design: DesignDocument;
  createdAt: string;
  updatedAt: string;
  versions: { at: string; design: DesignDocument }[];
}

/** An uploaded image. It belongs to one event; the file is kept in Supabase Storage. */
export interface AssetRecord {
  id: string;
  eventId: string;
  name: string;
  mimeType: string;
  url: string;
  createdAt: string;
}

/** One download of a resource, and the page it was downloaded from */
export interface DownloadRecord {
  resourceId: string;
  url: string;
  format: string;
  at: string;
  /** Who downloaded it, when the page told us */
  memberId?: string;
  memberName?: string;
  /** Mobile, Tablet or Desktop, worked out from the browser's user agent */
  device?: string;
  /** The visitor's IP address */
  ip?: string;
  /** The browser's own description of itself */
  userAgent?: string;
}

export interface FundraisingIndividual {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  profileImage: string;
  profileUrl: string;
}

export interface FundraisingTotals {
  goal: number;
  amountRaised: number;
  progress: number;
  donationCount: number;
  largestDonation: number;
  averageDonation: number;
  /** Worked out by the app from amountRaised and the cost-per-call setting */
  callsAnswered?: number;
  currency: string;
}

export interface FundraisingStory {
  motivation: string;
  personalMessage: string;
  biography: string;
}

export interface FundraisingRelationship {
  connection: string;
  supporting: string;
}

export interface FundraisingActivity {
  type: string;
  name: string;
  distanceKm: number;
  targetDistanceKm: number;
  /** Distance covered against the target, 0 to 1 */
  progress: number;
  date: string;
  location: string;
}

export interface FundraisingTeam {
  id: string;
  name: string;
  image: string;
  url: string;
  goal: number;
  amountRaised: number;
  progress: number;
  memberCount: number;
  donationCount: number;
  distanceKm: number;
  targetDistanceKm: number;
  /** Team distance covered against the team target, 0 to 1 */
  fitnessProgress: number;
  /** Worked out by the app from the team's amountRaised and the cost-per-call setting */
  callsAnswered?: number;
}

export interface FundraisingOrganisation {
  name: string;
}

export interface FundraisingEvent {
  name: string;
  date: string;
  location: string;
  url: string;
  logo: string;
  goal: number;
  amountRaised: number;
  progress: number;
  donationCount: number;
}

export interface NormalisedFundraiser {
  individual: FundraisingIndividual;
  fundraising: FundraisingTotals;
  story: FundraisingStory;
  relationship: FundraisingRelationship;
  activity: FundraisingActivity;
  team: FundraisingTeam;
  organisation: FundraisingOrganisation;
  event: FundraisingEvent;
  custom: Record<string, string | number>;
  /** Worked out by the app from the settings: how many of each impact unit the member has funded */
  impact: Record<string, number>;
  /** The same for the member's team */
  teamImpact: Record<string, number>;
}

export interface FieldDefinition {
  path: string;
  label: string;
  category: string;
  format: FieldFormat;
  kind: "text" | "image" | "number";
  /** PHP expression that gives this value on a Funraisin page. Missing = not mapped yet. */
  funraisin?: string;
  /** Which database lookups that expression relies on (see FUNRAISIN_LOOKUPS in embed-code.ts) */
  needs?: FunraisinLookup[];
  /** For a value the app works out itself: the fields it is calculated from */
  derivedFrom?: string[];
}

/** A group of values the embed code reads from the Funraisin database */
export type FunraisinLookup = "raised" | "team" | "teamRaised" | "teamDistance" | "organisation" | "custom";

/** The settings of one event: the variables you manage yourself */
export interface AppSettings {
  impacts: ImpactUnit[];
  customFields: CustomField[];
}

/** A custom variable of this event: a field the fundraising platform stores for each member */
export interface CustomField {
  /** The platform's field_name, used in templates as {{custom.key}} */
  key: string;
  /** The name shown in the editor (also used as the dummy value on the canvas) */
  label: string;
}

/**
 * Something a donation pays for, e.g. "Calls" at $39 each or "Nights" at $20 each.
 * The number shown on a resource is the amount raised divided by `amount`, rounded down.
 */
export interface ImpactUnit {
  /** Used in templates: {{impact.calls}} for the member, {{teamImpact.calls}} for the team. Made from the name. */
  key: string;
  /** The name shown in the editor. Renaming it renames the key, and designs are updated to match. */
  name: string;
  /** Dollars for one unit */
  amount: number;
}

export interface Connector {
  id: string;
  name: string;
  listFundraisers(): Promise<NormalisedFundraiser[]>;
  getFundraiser(id: string): Promise<NormalisedFundraiser | null>;
}
