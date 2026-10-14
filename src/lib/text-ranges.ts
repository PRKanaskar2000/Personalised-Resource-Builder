import type { TextRange } from "./types";

export type RangeStyle = Omit<TextRange, "start" | "end">;

export interface TextSegment {
  text: string;
  style: RangeStyle;
}

/**
 * Cut a text into pieces that each have one style.
 * "Hello world" with a red range over "world" -> [{ "Hello " }, { "world", red }]
 * A range never cuts a {{field}} in half: it is widened to cover the whole field.
 */
export function textSegments(content: string, ranges: TextRange[] = []): TextSegment[] {
  const fields = [...content.matchAll(/\{\{[^}]*\}\}/g)].map((match) => [match.index, match.index + match[0].length]);
  const inside = (position: number) => fields.find(([from, to]) => position > from && position < to);

  const snapped = ranges
    .map((range) => ({
      ...range,
      start: Math.max(0, inside(range.start)?.[0] ?? range.start),
      end: Math.min(content.length, inside(range.end)?.[1] ?? range.end),
    }))
    .filter((range) => range.end > range.start);

  // Every place where a style starts or stops
  const points = [...new Set([0, content.length, ...snapped.flatMap((range) => [range.start, range.end])])].sort(
    (a, b) => a - b,
  );

  return points
    .slice(0, -1)
    .map((from, index) => {
      const to = points[index + 1];
      // Later ranges win where two overlap
      const style: RangeStyle = {};
      for (const range of snapped) {
        if (range.start <= from && range.end >= to) {
          if (range.color) style.color = range.color;
          if (range.fontFamily) style.fontFamily = range.fontFamily;
          if (range.fontWeight) style.fontWeight = range.fontWeight;
          if (range.fontSize) style.fontSize = range.fontSize;
          if (range.textTransform) style.textTransform = range.textTransform;
        }
      }
      return { text: content.slice(from, to), style };
    })
    .filter((segment) => segment.text);
}

/** Style the characters start..end, on top of any styles already there */
export function addRange(ranges: TextRange[] = [], start: number, end: number, style: RangeStyle): TextRange[] {
  if (end <= start) return ranges;
  const same = ranges.find((range) => range.start === start && range.end === end);
  if (same) return ranges.map((range) => (range === same ? { ...range, ...style } : range));
  return [...ranges, { start, end, ...style }];
}

/**
 * Keep the styled ranges on the right words after the text is edited.
 * Works out which part of the text changed, then moves everything after it.
 */
export function shiftRanges(ranges: TextRange[] = [], before: string, after: string): TextRange[] {
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix++;
  }
  const changedEnd = before.length - suffix; // where the changed part ended in the old text
  const moved = after.length - before.length;

  const move = (position: number, edge: "start" | "end") => {
    if (position <= prefix) return position;
    if (position >= changedEnd) return position + moved;
    return edge === "start" ? prefix : after.length - suffix; // was inside the changed part
  };

  return ranges
    .map((range) => ({ ...range, start: move(range.start, "start"), end: move(range.end, "end") }))
    .filter((range) => range.end > range.start);
}
