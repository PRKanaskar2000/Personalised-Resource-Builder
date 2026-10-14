// The fonts a design can use, and the weights each one has on Google Fonts.
// To offer another font, add it here: the editor's menus and the export both read this list.
export interface FontDefinition {
  family: string;
  weights: number[];
  /** Optical-size range, for fonts that adjust their shapes to the text size */
  opticalSize?: string;
}

export const FONTS: FontDefinition[] = [
  { family: "Fraunces", weights: [400, 500, 600, 700], opticalSize: "9..144" },
  { family: "Source Sans 3", weights: [400, 500, 600, 700] },
  { family: "Montserrat", weights: [400, 500, 600, 700] },
  { family: "Poppins", weights: [400, 500, 600, 700] },
  { family: "Open Sans", weights: [400, 500, 600, 700] },
  { family: "Roboto", weights: [400, 500, 700] },
  { family: "Lato", weights: [400, 700] },
  { family: "Playfair Display", weights: [400, 500, 600, 700] },
  { family: "Oswald", weights: [400, 500, 600, 700] },
  { family: "Bebas Neue", weights: [400] },
];

export const WEIGHT_NAMES: Record<number, string> = { 400: "Regular", 500: "Medium", 600: "Semi-bold", 700: "Bold" };

/** The weights a font has (a font not in the list is assumed to have regular and bold) */
export function weightsOf(family: string): number[] {
  return FONTS.find((font) => font.family === family)?.weights ?? [400, 700];
}

/** The closest weight the font really has, e.g. Bebas Neue 700 -> 400 */
export function nearestWeight(family: string, weight: number): number {
  return weightsOf(family).reduce((best, item) => (Math.abs(item - weight) < Math.abs(best - weight) ? item : best));
}

/** Google Fonts stylesheet address for the given fonts (all of them by default) */
export function googleFontsUrl(fonts: FontDefinition[] = FONTS): string {
  const families = fonts.map((font) => {
    const name = font.family.replaceAll(" ", "+");
    return font.opticalSize
      ? `family=${name}:opsz,wght@${font.weights.map((weight) => `${font.opticalSize},${weight}`).join(";")}`
      : `family=${name}:wght@${font.weights.join(";")}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}
