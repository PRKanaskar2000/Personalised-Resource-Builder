import type { FieldDefinition } from "./types";

export const FIELD_REGISTRY: FieldDefinition[] = [
  { path: "individual.firstName", label: "First name", category: "Individual", format: "plain", kind: "text" },
  { path: "individual.lastName", label: "Last name", category: "Individual", format: "plain", kind: "text" },
  { path: "individual.fullName", label: "Full name", category: "Individual", format: "plain", kind: "text" },
  { path: "individual.profileImage", label: "Profile image", category: "Individual", format: "plain", kind: "image" },
  { path: "individual.profileUrl", label: "Profile URL", category: "Individual", format: "plain", kind: "text" },
  { path: "fundraising.goal", label: "Goal", category: "Fundraising", format: "currency", kind: "number" },
  { path: "fundraising.amountRaised", label: "Amount raised", category: "Fundraising", format: "currency", kind: "number" },
  { path: "fundraising.progress", label: "Progress", category: "Fundraising", format: "percent", kind: "number" },
  { path: "fundraising.donationCount", label: "Donation count", category: "Fundraising", format: "plain", kind: "number" },
  { path: "story.motivation", label: "Motivation", category: "Story", format: "plain", kind: "text" },
  { path: "story.personalMessage", label: "Personal message", category: "Story", format: "plain", kind: "text" },
  { path: "story.biography", label: "Biography", category: "Story", format: "plain", kind: "text" },
  { path: "relationship.connection", label: "Connection", category: "Relationship", format: "plain", kind: "text" },
  { path: "relationship.supporting", label: "Supporting", category: "Relationship", format: "plain", kind: "text" },
  { path: "activity.type", label: "Activity type", category: "Activity", format: "plain", kind: "text" },
  { path: "activity.name", label: "Activity name", category: "Activity", format: "plain", kind: "text" },
  { path: "activity.distanceKm", label: "Distance", category: "Activity", format: "distance", kind: "number" },
  { path: "activity.targetDistanceKm", label: "Target distance", category: "Activity", format: "distance", kind: "number" },
  { path: "activity.date", label: "Activity date", category: "Activity", format: "date", kind: "text" },
  { path: "activity.location", label: "Activity location", category: "Activity", format: "plain", kind: "text" },
  { path: "team.name", label: "Team name", category: "Team", format: "plain", kind: "text" },
  { path: "team.image", label: "Team image", category: "Team", format: "plain", kind: "image" },
  { path: "team.amountRaised", label: "Team raised", category: "Team", format: "currency", kind: "number" },
  { path: "event.name", label: "Event name", category: "Event", format: "plain", kind: "text" },
  { path: "event.date", label: "Event date", category: "Event", format: "date", kind: "text" },
  { path: "event.location", label: "Event location", category: "Event", format: "plain", kind: "text" },
  { path: "event.logo", label: "Event logo", category: "Event", format: "plain", kind: "image" },
];

export const TEXT_FIELDS = FIELD_REGISTRY.filter((field) => field.kind !== "image");
export const IMAGE_FIELDS = FIELD_REGISTRY.filter((field) => field.kind === "image");
