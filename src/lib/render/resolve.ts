import { FIELD_BY_PATH } from "../field-registry";
import { getFieldValue, isEmptyValue, resolveFields } from "../personalisation";
import { textSegments, type TextSegment } from "../text-ranges";
import type { DesignDocument, Layer, NormalisedFundraiser } from "../types";

export interface ResolvedLayer {
  layer: Layer;
  visible: boolean;
  /** The whole text, with fields filled in */
  text?: string;
  /** The same text cut into pieces that each have one style */
  segments?: TextSegment[];
  imageSrc?: string;
  progress?: number;
}

export function resolveLayers(design: DesignDocument, fundraiser?: NormalisedFundraiser | null): ResolvedLayer[] {
  return design.layers.map((layer) => {
    if (layer.hidden) return { layer, visible: false };
    if (layer.type === "dynamic-text") {
      // An old-style template that is only a field name ("individual.fullName") still works
      const bare = layer.template.trim();
      const template = FIELD_BY_PATH.has(bare) ? `{{${bare}}}` : layer.template;
      const segments = textSegments(template, layer.ranges).map((segment) => ({
        ...segment,
        text: fundraiser ? resolveFields(segment.text, fundraiser, layer.format) : segment.text,
      }));
      const text = segments.map((segment) => segment.text).join("");
      const empty = !text || text.includes("{{");
      return { layer, visible: !(layer.hideIfEmpty && empty), text, segments };
    }
    if (layer.type === "dynamic-image") {
      const value = fundraiser ? getFieldValue(fundraiser, layer.field) : layer.fallback;
      // Only use the value if it is an image address (a custom field may hold other text)
      const isImageUrl = typeof value === "string" && /^(https?:\/\/|\/|data:image\/)/.test(value);
      const imageSrc = isImageUrl ? (value as string) : layer.fallback;
      return { layer, visible: !(layer.hideIfEmpty && isEmptyValue(imageSrc)), imageSrc };
    }
    if (layer.type === "progress-bar") {
      const value = fundraiser ? getFieldValue(fundraiser, layer.field) : 0.45;
      const progress = typeof value === "number" ? Math.max(0, Math.min(1.2, value)) : 0;
      return { layer, visible: true, progress };
    }
    if (layer.type === "text") {
      return { layer, visible: true, text: layer.text, segments: textSegments(layer.text, layer.ranges) };
    }
    if (layer.type === "image") return { layer, visible: true, imageSrc: layer.source };
    return { layer, visible: true };
  });
}
