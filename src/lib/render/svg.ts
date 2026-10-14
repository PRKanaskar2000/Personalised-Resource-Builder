import { imageDataUrl } from "./inline-images";
import { inlineFontCss } from "./inline-fonts";
import {
  FILL_STYLE,
  IMAGE_STYLE,
  TEXT_BOX_STYLE,
  boxStyle,
  canvasStyle,
  segmentStyle,
  textStyle,
  toCss,
} from "./layer-styles";
import { resolveLayers, type ResolvedLayer } from "./resolve";
import type { DesignDocument, NormalisedFundraiser } from "../types";

// Builds the finished image of a design as one self-contained SVG file.
// Inside the SVG is ordinary HTML laid out with the same styles as the editor (layer-styles.ts),
// so text wraps, centres and uses fonts exactly as it does on the editor canvas.
// Fonts and pictures are written into the file, because an image cannot load anything else.

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const tag = (style: Parameters<typeof toCss>[0], content = "") => `<div style="${esc(toCss(style))}">${content}</div>`;

/** Which fonts and weights the design's texts use: { "Fraunces": {600, 700} } */
function usedFonts(items: ResolvedLayer[]) {
  const used = new Map<string, Set<number>>();
  const add = (family: string, weight: number) => used.set(family, (used.get(family) ?? new Set()).add(weight));
  for (const { layer, visible, segments } of items) {
    if (!visible || !("style" in layer)) continue;
    add(layer.style.fontFamily, layer.style.fontWeight);
    for (const { style } of segments ?? []) {
      add(style.fontFamily ?? layer.style.fontFamily, style.fontWeight ?? layer.style.fontWeight);
    }
  }
  return used;
}

function layerHtml({ layer, text, segments, imageSrc, progress }: ResolvedLayer, images: Map<string, string | null>) {
  let content = "";
  if ((layer.type === "text" || layer.type === "dynamic-text") && text) {
    const spans = (segments ?? []).map(
      (segment) => `<span style="${esc(toCss(segmentStyle(segment.style)))}">${esc(segment.text)}</span>`,
    );
    content = tag(TEXT_BOX_STYLE, tag(textStyle(layer.style), spans.join("")));
  } else if (layer.type === "image" || layer.type === "dynamic-image") {
    const picture = imageSrc && images.get(imageSrc);
    if (picture) content = `<img src="${esc(picture)}" alt="" style="${esc(toCss(IMAGE_STYLE))}" />`;
  } else if (layer.type === "progress-bar") {
    const bar = tag({ ...FILL_STYLE, width: `${(progress ?? 0) * 100}%`, background: layer.fill });
    content = tag({ ...FILL_STYLE, background: layer.track }, bar);
  }
  return tag(boxStyle(layer), content);
}

export async function designToSvg(design: DesignDocument, fundraiser?: NormalisedFundraiser | null): Promise<string> {
  const { width, height, backgroundImage } = design.canvas;
  const items = resolveLayers(design, fundraiser).filter((item) => item.visible);

  // Fetch every picture and font the design needs, all at once
  const sources = [...new Set([backgroundImage, ...items.map((item) => item.imageSrc)].filter((src): src is string => !!src))];
  const [fontCss, ...pictures] = await Promise.all([inlineFontCss(usedFonts(items)), ...sources.map(imageDataUrl)]);
  const images = new Map(sources.map((src, index) => [src, pictures[index]]));

  const background = backgroundImage ? (images.get(backgroundImage) ?? undefined) : undefined;
  const page = tag(
    { ...canvasStyle(design.canvas, background), fontFamily: "sans-serif", lineHeight: 1.5 },
    `<style>${fontCss}</style>${items.map((item) => layerHtml(item, images)).join("")}`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <foreignObject width="${width}" height="${height}">
    <div xmlns="http://www.w3.org/1999/xhtml">${page}</div>
  </foreignObject>
</svg>`;
}
