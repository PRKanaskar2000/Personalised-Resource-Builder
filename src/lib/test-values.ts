import { FIELD_BY_PATH } from "./field-registry";
import { templateFields } from "./personalisation";
import type { DesignDocument, NormalisedFundraiser } from "./types";

// Test values for the editor's Preview: try each name on a post short, medium or long,
// to check that auto-fit and line breaks work for every member.

export type TestLength = "short" | "medium" | "long";

const EXAMPLES: Record<string, Record<TestLength, string>> = {
  "individual.firstName": { short: "Al", medium: "Sarah", long: "Maximilian-Alexander" },
  "individual.lastName": { short: "Li", medium: "Johnson", long: "Montgomery-Richardson" },
  "individual.fullName": { short: "Al Li", medium: "Sarah Johnson", long: "Maximilian-Alexander Montgomery-Richardson" },
  "team.name": { short: "Team A", medium: "Blue Sharks", long: "The Amazing Blue Sharks Swimming Club of Northern Sydney" },
  // An activity is one word, so its long example is just the longest activity
  "activity.type": { short: "Run", medium: "Walking", long: "Swimming" },
  "organisation.name": {
    short: "ACME",
    medium: "Lifeline Australia",
    long: "The Northern Beaches Community Foundation for Children and Families",
  },
};

// Who someone walks for (relationship), always one person: Mum is short, Father medium, My Grandmother long
const RELATIONSHIP: Record<TestLength, string> = { short: "Mum", medium: "Father", long: "My Grandmother" };
const REASON: Record<TestLength, string> = {
  short: "Mum",
  medium: "For my mum",
  long: "For my mum, who has always believed in me and in this cause",
};

// Custom variables are matched by their name: custom.team_name is tried like a team name, and so on
const BY_NAME: [RegExp, Record<TestLength, string>][] = [
  [/first_?name/i, EXAMPLES["individual.firstName"]],
  [/team/i, EXAMPLES["team.name"]],
  [/activity/i, EXAMPLES["activity.type"]],
  [/org/i, EXAMPLES["organisation.name"]],
  [/reason|why|story|message/i, REASON],
];

export function testExample(path: string, length: TestLength): string {
  const examples = EXAMPLES[path] ?? BY_NAME.find(([pattern]) => pattern.test(path))?.[1] ?? RELATIONSHIP;
  return examples[length];
}

/** The text fields a design shows (names, team, custom variables…), each once. Numbers and photos are left out. */
export function textFieldsOf(design: DesignDocument): string[] {
  const paths = design.layers.flatMap((layer) => (layer.type === "dynamic-text" ? templateFields(layer.template) : []));
  return [...new Set(paths)].filter((path) => {
    const field = FIELD_BY_PATH.get(path);
    return field ? field.kind === "text" && !path.endsWith(".id") : path.startsWith("custom.") || path.startsWith("relationship.");
  });
}

/** The fundraiser with some values replaced: { "team.name": "Blue Sharks" } */
export function withTestValues(fundraiser: NormalisedFundraiser, values: Record<string, string>): NormalisedFundraiser {
  const copy = structuredClone(fundraiser) as unknown as Record<string, Record<string, unknown>>;
  for (const [path, value] of Object.entries(values)) {
    const [section, key] = path.split(".");
    if (copy[section] && key) copy[section][key] = value;
  }
  return copy as unknown as NormalisedFundraiser;
}
