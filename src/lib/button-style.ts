import { FONTS, googleFontsUrl } from "./fonts";
import type { ButtonStyle, DesignDocument } from "./types";

// The Download button under a post on a fundraising page.
// The editor shows it with these styles, and the embed script puts the same styles on the real button.

export const DEFAULT_BUTTON: ButtonStyle = {
  enabled: false,
  text: "Download",
  fontFamily: "",
  fontSize: 16,
  fontWeight: 600,
  color: "#FFFFFF",
  background: "#2420BE",
  borderWidth: 0,
  borderColor: "#1A1915",
  radius: 8,
  paddingX: 24,
  paddingY: 10,
  widthMode: "auto",
  width: 220,
};

/** The design's button settings, with defaults for anything not set */
export const buttonOf = (design: DesignDocument): ButtonStyle => ({ ...DEFAULT_BUTTON, ...design.button });

/** The button's look as CSS properties, e.g. { fontSize: "16px", borderRadius: "8px" } */
export function buttonCss(style: ButtonStyle): Record<string, string> {
  return {
    fontFamily: style.fontFamily ? `"${style.fontFamily}", sans-serif` : "inherit",
    fontSize: `${style.fontSize}px`,
    fontWeight: String(style.fontWeight),
    lineHeight: "1.2",
    color: style.color,
    background: style.background,
    border: style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor}` : "none",
    borderRadius: `${style.radius}px`,
    padding: `${style.paddingY}px ${style.paddingX}px`,
    width: style.widthMode === "full" ? "100%" : style.widthMode === "fixed" ? `${style.width}px` : "auto",
    maxWidth: "100%",
    cursor: "pointer",
  };
}

/** What the embed script needs for the button: its text, its CSS, and the font to load. Null = page CSS only. */
export function embedButton(design: DesignDocument) {
  const style = buttonOf(design);
  if (!style.enabled) return null;
  const font = FONTS.find((item) => item.family === style.fontFamily);
  return { text: style.text || "Download", css: buttonCss(style), fontUrl: font ? googleFontsUrl([font]) : null };
}
