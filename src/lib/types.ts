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
}

export interface DesignDocument {
  version: 1;
  canvas: CanvasConfig;
  layers: Layer[];
}

export interface ResourceRecord {
  id: string;
  name: string;
  organisationId: string;
  campaignId: string;
  templateId?: string;
  design: DesignDocument;
  createdAt: string;
  updatedAt: string;
  versions: { at: string; design: DesignDocument }[];
}

export interface TemplateRecord {
  id: string;
  name: string;
  description: string;
  design: DesignDocument;
  lockedLayerIds: string[];
  createdAt: string;
}

export interface AssetRecord {
  id: string;
  name: string;
  kind: "background" | "graphic" | "icon" | "upload" | "logo";
  scope: "platform" | "organisation" | "campaign";
  mimeType: string;
  url: string;
  createdAt: string;
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
}

export interface FundraisingEvent {
  name: string;
  date: string;
  location: string;
  url: string;
  logo: string;
}

export interface NormalisedFundraiser {
  individual: FundraisingIndividual;
  fundraising: FundraisingTotals;
  story: FundraisingStory;
  relationship: FundraisingRelationship;
  activity: FundraisingActivity;
  team: FundraisingTeam;
  event: FundraisingEvent;
  custom: Record<string, string | number>;
}

export interface FieldDefinition {
  path: string;
  label: string;
  category: string;
  format: FieldFormat;
  kind: "text" | "image" | "number";
}

export interface Connector {
  id: string;
  name: string;
  listFundraisers(): Promise<NormalisedFundraiser[]>;
  getFundraiser(id: string): Promise<NormalisedFundraiser | null>;
}
