import type { TextSegment } from "./text-ranges";
import type { Layer, TextStyle } from "./types";

// Auto-fit: makes a text smaller when it is too long for its box, so a 15-word team name still fits.
// The server cannot measure real text, so the size is worked out from typical letter widths.
// The editor and the finished image both use this, so they always choose the same size.

// Width of a letter as a share of the font size, for a typical sans-serif font
function letterWidth(char: string): number {
  if (char === " ") return 0.28;
  if ("iljI.,:;'|!".includes(char)) return 0.27;
  if ('frt()[]-"'.includes(char)) return 0.37;
  if ("mwMW@%".includes(char)) return 0.86;
  if (/[0-9]/.test(char)) return 0.56;
  if (/[A-Z]/.test(char)) return 0.68;
  return 0.55;
}

// How wide each font runs compared with that typical font (Oswald and Bebas Neue are narrow)
const FONT_WIDTH: Record<string, number> = {
  "Open Sans": 1.05,
  Montserrat: 1.15,
  Poppins: 1.12,
  "Source Sans 3": 0.93,
  Roboto: 1.0,
  Lato: 0.98,
  Fraunces: 1.05,
  "Playfair Display": 1.0,
  Oswald: 0.78,
  "Bebas Neue": 0.72,
};

const DEFAULT_MIN_SIZE = 16;

function withCase(text: string, letterCase: TextStyle["textTransform"]) {
  if (letterCase === "uppercase") return text.toUpperCase();
  if (letterCase === "lowercase") return text.toLowerCase();
  return text;
}

/**
 * How much to shrink a text so it fits its layer: 1 = it already fits, 0.5 = half size.
 * Only for text layers with auto-fit on; it never makes text bigger.
 */
export function fitScale(layer: Layer, segments: TextSegment[]): number {
  if (!("style" in layer) || !layer.style.autoFit) return 1;
  const style = layer.style;
  const border = (layer.borderWidth ?? 0) * 2;
  // The text box has 8px padding on each side; keep a small margin because widths are estimates
  const boxWidth = (layer.width - 16 - border) * 0.94;
  const boxHeight = (layer.height - border) * 0.96;
  const smallest = Math.min(1, Math.max(4, style.minFontSize ?? DEFAULT_MIN_SIZE) / style.fontSize);

  // Every letter with its width at full size, and its font size
  const letters = segments.flatMap((segment) => {
    const size = segment.style.fontSize ?? style.fontSize;
    const family = segment.style.fontFamily ?? style.fontFamily;
    const weight = segment.style.fontWeight ?? style.fontWeight;
    const factor = (FONT_WIDTH[family] ?? 1) * (1 + (weight - 400) * 0.0002);
    return [...withCase(segment.text, segment.style.textTransform ?? style.textTransform)].map((char) => ({
      char,
      size,
      width: letterWidth(char) * size * factor,
    }));
  });

  // Lay the words out in lines, as the browser does, and check the lines fit the box height
  function fits(scale: number) {
    let height = 0;
    let lineWidth = 0;
    let lineSize = 0;
    let wordWidth = 0;
    let wordSize = 0;
    const endLine = () => {
      height += (lineSize || style.fontSize) * scale * style.lineHeight;
      lineWidth = 0;
      lineSize = 0;
    };
    const placeWord = () => {
      if (wordWidth === 0) return;
      if (lineWidth > 0 && lineWidth + wordWidth > boxWidth) endLine();
      // A word longer than the whole line is broken over several lines
      while (wordWidth > boxWidth) {
        lineSize = Math.max(lineSize, wordSize);
        endLine();
        wordWidth -= boxWidth;
      }
      lineWidth += wordWidth;
      lineSize = Math.max(lineSize, wordSize);
      wordWidth = 0;
      wordSize = 0;
    };
    for (const letter of letters) {
      if (letter.char === "\n") {
        placeWord();
        lineSize = lineSize || letter.size;
        endLine();
        continue;
      }
      wordWidth += letter.width * scale + style.letterSpacing;
      wordSize = Math.max(wordSize, letter.size);
      if (letter.char === " ") placeWord();
    }
    placeWord();
    if (lineWidth > 0) endLine();
    return height <= boxHeight;
  }

  for (let scale = 1; scale > smallest; scale -= 0.02) {
    if (fits(scale)) return scale;
  }
  return smallest;
}
