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

export function createDesign(width = 1080, height = 1080): DesignDocument {
  return {
    version: 1,
    canvas: { width, height, background: "#1F4A45" },
    layers: [],
  };
}

export function defaultFundraisingPoster(): DesignDocument {
  return {
    version: 1,
    canvas: { width: 1080, height: 1080, background: "#1F4A45" },
    layers: [
      {
        id: "wash",
        type: "rect",
        name: "Paper wash",
        x: 64,
        y: 64,
        width: 952,
        height: 952,
        rotation: 0,
        opacity: 1,
        locked: true,
        hidden: false,
        fill: "#F4EFE6",
        radius: 36,
      },
      {
        id: "band",
        type: "rect",
        name: "Header band",
        x: 64,
        y: 64,
        width: 952,
        height: 220,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        fill: "#C45C3E",
        radius: 0,
      },
      {
        id: "event",
        type: "dynamic-text",
        name: "Event",
        x: 100,
        y: 110,
        width: 880,
        height: 50,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        template: "{{event.name}}",
        style: { ...DEFAULT_TEXT_STYLE, fontFamily: "Source Sans 3", fontSize: 28, fontWeight: 600, letterSpacing: 4 },
      },
      {
        id: "photo",
        type: "dynamic-image",
        name: "Profile photo",
        x: 390,
        y: 210,
        width: 300,
        height: 300,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        hideIfEmpty: true,
        field: "individual.profileImage",
        objectFit: "cover",
        radius: 160,
      },
      {
        id: "name",
        type: "dynamic-text",
        name: "Fundraiser name",
        x: 90,
        y: 540,
        width: 900,
        height: 80,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        template: "{{individual.fullName}}",
        style: { ...DEFAULT_TEXT_STYLE, fontSize: 64, color: "#1A1915" },
      },
      {
        id: "line",
        type: "dynamic-text",
        name: "Personalisation line",
        x: 90,
        y: 630,
        width: 900,
        height: 70,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        template: "I am {{activity.type}} for {{relationship.supporting}}",
        style: {
          ...DEFAULT_TEXT_STYLE,
          fontFamily: "Source Sans 3",
          fontSize: 32,
          fontWeight: 500,
          color: "#3C6E67",
        },
      },
      {
        id: "raised",
        type: "dynamic-text",
        name: "Amount raised",
        x: 90,
        y: 740,
        width: 900,
        height: 50,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        template: "{{fundraising.amountRaised}} of {{fundraising.goal}}",
        style: {
          ...DEFAULT_TEXT_STYLE,
          fontFamily: "Source Sans 3",
          fontSize: 30,
          fontWeight: 700,
          color: "#1A1915",
        },
      },
      {
        id: "progress",
        type: "progress-bar",
        name: "Progress",
        x: 180,
        y: 820,
        width: 720,
        height: 22,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        field: "fundraising.progress",
        track: "#E7E0D4",
        fill: "#C45C3E",
        radius: 12,
      },
      {
        id: "cta",
        type: "text",
        name: "Call to action",
        x: 90,
        y: 880,
        width: 900,
        height: 50,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        text: "Donate to this challenge",
        style: {
          ...DEFAULT_TEXT_STYLE,
          fontFamily: "Source Sans 3",
          fontSize: 24,
          fontWeight: 600,
          color: "#1F4A45",
          letterSpacing: 2,
        },
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
