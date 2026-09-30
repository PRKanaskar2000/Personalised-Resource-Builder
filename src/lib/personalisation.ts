import type { FieldFormat, NormalisedFundraiser } from "./types";

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

export function resolveTemplate(
  template: string,
  fundraiser: NormalisedFundraiser,
  format: FieldFormat = "plain",
): string {
  if (!template.includes("{{")) {
    const value = getFieldValue(fundraiser, template);
    if (value !== undefined) return formatValue(value, format, fundraiser.fundraising.currency);
    return template;
  }
  return template.replace(TOKEN, (_, path: string) => {
    const trimmed = path.trim();
    const fieldFormat = trimmed.includes("fundraising.") || trimmed.includes("amount") || trimmed.includes("goal")
      ? format === "plain"
        ? guessFormat(trimmed)
        : format
      : format === "plain"
        ? guessFormat(trimmed)
        : format;
    return formatValue(getFieldValue(fundraiser, trimmed), fieldFormat, fundraiser.fundraising.currency);
  });
}

function guessFormat(path: string): FieldFormat {
  if (path.includes("progress")) return "percent";
  if (path.includes("goal") || path.includes("amountRaised")) return "currency";
  if (path.toLowerCase().includes("distance")) return "distance";
  if (path.toLowerCase().includes("date")) return "date";
  return "plain";
}

export function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}
