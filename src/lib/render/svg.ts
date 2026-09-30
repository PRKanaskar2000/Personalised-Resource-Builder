import { resolveLayers } from "./resolve";
import type { DesignDocument, NormalisedFundraiser, TextStyle } from "../types";

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textAnchor(align: TextStyle["align"]) {
  if (align === "left") return "start";
  if (align === "right") return "end";
  return "middle";
}

function textX(align: TextStyle["align"], x: number, width: number) {
  if (align === "left") return x + 8;
  if (align === "right") return x + width - 8;
  return x + width / 2;
}

export function designToSvg(design: DesignDocument, fundraiser?: NormalisedFundraiser | null): string {
  const { width, height, background } = design.canvas;
  const nodes = resolveLayers(design, fundraiser)
    .filter((item) => item.visible)
    .map(({ layer, text, imageSrc, progress }) => {
      const common = `opacity="${layer.opacity}" transform="rotate(${layer.rotation} ${layer.x + layer.width / 2} ${layer.y + layer.height / 2})"`;
      if (layer.type === "rect") {
        return `<rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${layer.radius}" fill="${layer.fill}" ${common} />`;
      }
      if (layer.type === "ellipse") {
        return `<ellipse cx="${layer.x + layer.width / 2}" cy="${layer.y + layer.height / 2}" rx="${layer.width / 2}" ry="${layer.height / 2}" fill="${layer.fill}" ${common} />`;
      }
      if (layer.type === "progress-bar") {
        const filled = Math.round(layer.width * (progress ?? 0));
        return `<g ${common}><rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${layer.radius}" fill="${layer.track}" /><rect x="${layer.x}" y="${layer.y}" width="${filled}" height="${layer.height}" rx="${layer.radius}" fill="${layer.fill}" /></g>`;
      }
      if ((layer.type === "image" || layer.type === "dynamic-image") && imageSrc) {
        const clip = `clip-${layer.id}`;
        return `<defs><clipPath id="${clip}"><rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${"radius" in layer ? layer.radius : 0}" /></clipPath></defs><image href="${esc(imageSrc)}" x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})" ${common} />`;
      }
      if (text && (layer.type === "text" || layer.type === "dynamic-text")) {
        const style = layer.style;
        return `<text x="${textX(style.align, layer.x, layer.width)}" y="${layer.y + layer.height / 2}" text-anchor="${textAnchor(style.align)}" dominant-baseline="middle" font-family="${esc(style.fontFamily)}" font-size="${style.fontSize}" font-weight="${style.fontWeight}" fill="${style.color}" letter-spacing="${style.letterSpacing}" ${common}>${esc(text)}</text>`;
      }
      return "";
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${background}" />
  ${nodes}
</svg>`;
}
