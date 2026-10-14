import { nanoid } from "nanoid";
import type { DesignDocument, Layer, TextStyle } from "./types";

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Fraunces",
  fontSize: 36,
  fontWeight: 600,
  color: "#F4EFE6",
  align: "center",
  lineHeight: 1.2,
  letterSpacing: 0,
};

/**
 * The design every new resource starts with (the sample): a plain colour background,
 * the fundraiser's first name, and their photo in a circle. Both come from the Funraisin page.
 */
export function defaultDesign(): DesignDocument {
  const base = { rotation: 0, opacity: 1, locked: false, hidden: false };
  return {
    version: 1,
    canvas: { width: 1080, height: 1080, background: "#C45C3E" },
    layers: [
      {
        ...base,
        id: "name",
        type: "dynamic-text",
        name: "User name",
        x: 90,
        y: 129,
        width: 900,
        height: 130,
        template: "{{individual.firstName}}",
        style: { ...DEFAULT_TEXT_STYLE, fontFamily: "Open Sans", fontSize: 104, fontWeight: 500, color: "#FFFFFF" },
      },
      {
        ...base,
        id: "photo",
        type: "dynamic-image",
        name: "User photo",
        // A 500px circle in the middle of the canvas
        x: 290,
        y: 290,
        width: 500,
        height: 500,
        radius: 250,
        field: "individual.profileImage",
        objectFit: "cover",
      },
    ],
  };
}

export function newLayer(type: Layer["type"], name?: string): Layer {
  const id = nanoid(8);
  const base = {
    id,
    name: name ?? type,
    x: 120,
    y: 120,
    width: 360,
    height: 80,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
  };

  switch (type) {
    case "rect":
      return { ...base, type, fill: "#C45C3E", radius: 12, height: 160 };
    case "ellipse":
      return { ...base, type, fill: "#C9A227", width: 180, height: 180 };
    case "text":
      return { ...base, type, text: "Add your message", style: { ...DEFAULT_TEXT_STYLE, color: "#1A1915" } };
    case "image":
      return { ...base, type, source: "", objectFit: "cover", radius: 16, width: 280, height: 280 };
    case "dynamic-text":
      return {
        ...base,
        type,
        template: "{{individual.fullName}}",
        style: { ...DEFAULT_TEXT_STYLE, color: "#1A1915" },
      };
    case "dynamic-image":
      return {
        ...base,
        type,
        field: "individual.profileImage",
        objectFit: "cover",
        radius: 140,
        width: 240,
        height: 240,
      };
    case "progress-bar":
      return {
        ...base,
        type,
        field: "fundraising.progress",
        track: "#E7E0D4",
        fill: "#C45C3E",
        radius: 10,
        height: 20,
        width: 640,
      };
  }
}

export function cloneDesign(design: DesignDocument): DesignDocument {
  return JSON.parse(JSON.stringify(design)) as DesignDocument;
}
