// The look of a slider's arrows and dots, chosen in the Slider embed code pop-up.
// They reach the fundraising page as CSS variables on the slider's div, e.g. style="--pr-arrow-bg:#e5007e".
// The defaults here are the same as the ones in embed.js, so only changed values are written into the code.

/** Which controls the slider shows */
export type SliderNav = "both" | "arrows" | "dots";

export interface SliderStyle {
  arrowColor: string;
  arrowBackground: string;
  /** Width and height of an arrow button, in pixels */
  arrowSize: number;
  arrowShape: "round" | "square";
  /** An image shown inside the arrow buttons instead of ‹ ›. It should point right; "previous" shows it flipped. "" = none */
  arrowIcon: string;
  /** Width and height of that image, in pixels */
  arrowIconSize: number;
  dotColor: string;
  activeDotColor: string;
  /** Width and height of a dot, in pixels */
  dotSize: number;
}

export const DEFAULT_SLIDER_STYLE: SliderStyle = {
  arrowColor: "#ffffff",
  arrowBackground: "#555555",
  arrowSize: 40,
  arrowShape: "round",
  arrowIcon: "",
  arrowIconSize: 20,
  dotColor: "#cccccc",
  activeDotColor: "#333333",
  dotSize: 10,
};

/** The style as CSS variables, for the preview and the embed code: { "--pr-arrow-size": "40px", … } */
export function sliderVariables(style: SliderStyle): Record<string, string> {
  return {
    "--pr-arrow-color": style.arrowColor,
    "--pr-arrow-bg": style.arrowBackground,
    "--pr-arrow-size": `${style.arrowSize}px`,
    "--pr-arrow-radius": style.arrowShape === "round" ? "50%" : "6px",
    "--pr-arrow-icon-size": `${style.arrowIconSize}px`,
    "--pr-dot": style.dotColor,
    "--pr-dot-active": style.activeDotColor,
    "--pr-dot-size": `${style.dotSize}px`,
  };
}

/** The style="…" text for the embed code: only the values that differ from the defaults ("" when none do) */
export function sliderStyleAttribute(style: SliderStyle): string {
  const defaults = sliderVariables(DEFAULT_SLIDER_STYLE);
  return Object.entries(sliderVariables(style))
    .filter(([name, value]) => defaults[name] !== value)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
}
