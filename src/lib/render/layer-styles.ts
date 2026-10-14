import type { CSSProperties } from "react";
import type { CanvasConfig, Layer, TextRange, TextStyle } from "../types";

// How each part of a design is laid out, as plain style objects.
// The editor (ResourceCanvas) and the export (svg.ts) both use these,
// so a download always matches what the editor shows: same wrapping, fonts and spacing.

export function canvasStyle(canvas: CanvasConfig, backgroundImage = canvas.backgroundImage): CSSProperties {
  return {
    position: "relative",
    width: canvas.width,
    height: canvas.height,
    overflow: "hidden",
    backgroundColor: canvas.background,
    backgroundImage: backgroundImage ? `url("${backgroundImage}")` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

/** The box every layer sits in: position, size, rotation, rounded corners, border, fill */
export function boxStyle(layer: Layer): CSSProperties {
  return {
    position: "absolute",
    boxSizing: "border-box",
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
    opacity: layer.opacity,
    transform: `rotate(${layer.rotation}deg)`,
    borderRadius: layer.type === "ellipse" ? "50%" : "radius" in layer ? layer.radius : 0,
    overflow: "hidden",
    border: layer.borderWidth ? `${layer.borderWidth}px solid ${layer.borderColor ?? "#1A1915"}` : undefined,
    background: layer.type === "rect" || layer.type === "ellipse" ? layer.fill : "transparent",
  };
}

/** Outer text box: centres the text vertically */
export const TEXT_BOX_STYLE: CSSProperties = {
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  width: "100%",
  height: "100%",
  padding: "0 8px",
};

/** Inner text block: font, alignment, and line wrapping (typed line breaks are kept) */
export function textStyle(style: TextStyle): CSSProperties {
  return {
    width: "100%",
    fontFamily: fontStack(style.fontFamily),
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    color: style.color,
    textAlign: style.align,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    textTransform: style.textTransform,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  };
}

/** A styled part of the text (selected words with their own colour, font or weight) */
export function segmentStyle(style: Omit<TextRange, "start" | "end">): CSSProperties {
  return {
    color: style.color,
    fontFamily: style.fontFamily ? fontStack(style.fontFamily) : undefined,
    fontWeight: style.fontWeight,
    fontSize: style.fontSize,
    textTransform: style.textTransform,
  };
}

export const IMAGE_STYLE: CSSProperties = { display: "block", width: "100%", height: "100%", objectFit: "cover" };
export const FILL_STYLE: CSSProperties = { width: "100%", height: "100%" };

function fontStack(family: string) {
  return `"${family}", sans-serif`;
}

// Style properties whose numbers are plain numbers, not pixels
const UNITLESS = new Set(["opacity", "lineHeight", "fontWeight"]);

/** Turn a style object into CSS text: { fontSize: 20 } -> "font-size:20px" */
export function toCss(style: CSSProperties): string {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => {
      const name = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      return `${name}:${typeof value === "number" && !UNITLESS.has(key) ? `${value}px` : value}`;
    })
    .join(";");
}
