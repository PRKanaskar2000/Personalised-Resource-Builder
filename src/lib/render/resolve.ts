import { getFieldValue, isEmptyValue, resolveTemplate } from "../personalisation";
import type { DesignDocument, Layer, NormalisedFundraiser } from "../types";

export interface ResolvedLayer {
  layer: Layer;
  visible: boolean;
  text?: string;
  imageSrc?: string;
  progress?: number;
}

export function resolveLayers(design: DesignDocument, fundraiser?: NormalisedFundraiser | null): ResolvedLayer[] {
  return design.layers.map((layer) => {
    if (layer.hidden) return { layer, visible: false };
    if (layer.type === "dynamic-text") {
      const text = fundraiser ? resolveTemplate(layer.template, fundraiser, layer.format) : layer.template;
      const empty = !text || text.includes("{{");
      return { layer, visible: !(layer.hideIfEmpty && empty), text };
    }
    if (layer.type === "dynamic-image") {
      const value = fundraiser ? getFieldValue(fundraiser, layer.field) : layer.fallback;
      const imageSrc = typeof value === "string" && value ? value : layer.fallback;
      return { layer, visible: !(layer.hideIfEmpty && isEmptyValue(imageSrc)), imageSrc };
    }
    if (layer.type === "progress-bar") {
      const value = fundraiser ? getFieldValue(fundraiser, layer.field) : 0.45;
      const progress = typeof value === "number" ? Math.max(0, Math.min(1.2, value)) : 0;
      return { layer, visible: true, progress };
    }
    if (layer.type === "text") return { layer, visible: true, text: layer.text };
    if (layer.type === "image") return { layer, visible: true, imageSrc: layer.source };
    return { layer, visible: true };
  });
}
