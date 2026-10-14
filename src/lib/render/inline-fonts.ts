import { FONTS, googleFontsUrl, nearestWeight } from "../fonts";

// An exported image cannot load fonts from the internet, so the fonts a design uses
// are downloaded from Google Fonts once and written into the image as data: URLs.

// Asking as a modern browser makes Google reply with small .woff2 files
const BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
// Character sets to include (Western European and extended Latin)
const SUBSETS = ["latin", "latin-ext"];

const cssCache = new Map<string, Promise<string>>();
const fileCache = new Map<string, Promise<string>>();

function cached(cache: Map<string, Promise<string>>, key: string, load: () => Promise<string>) {
  if (!cache.has(key)) {
    const result = load();
    cache.set(key, result);
    result.catch(() => cache.delete(key)); // a failed download may be retried next time
  }
  return cache.get(key)!;
}

async function download(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": BROWSER }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Font download failed: ${response.status}`);
  return response;
}

const fontFile = (url: string) =>
  cached(fileCache, url, async () => {
    const bytes = Buffer.from(await (await download(url)).arrayBuffer());
    return `data:font/woff2;base64,${bytes.toString("base64")}`;
  });

/**
 * @font-face rules, with the font files inside them, for the given fonts.
 * `used` maps a font family to the weights needed: { "Fraunces": {600, 700} }
 */
export async function inlineFontCss(used: Map<string, Set<number>>): Promise<string> {
  const fonts = FONTS.filter((font) => used.has(font.family)).map((font) => ({
    ...font,
    weights: [...new Set([...used.get(font.family)!].map((weight) => nearestWeight(font.family, weight)))].sort(),
  }));
  if (fonts.length === 0) return "";

  try {
    const url = googleFontsUrl(fonts);
    const css = await cached(cssCache, url, async () => (await download(url)).text());

    // Each block looks like:  /* latin */ @font-face { font-family: 'X'; font-weight: 600; src: url(…) … }
    // One font file often covers several weights, so blocks with the same file are merged into one.
    const faces = new Map<string, { family: string; file: string; range: string; weights: number[] }>();
    for (const [, subset, block] of css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face \{([^}]+)\}/g)) {
      if (!SUBSETS.includes(subset)) continue;
      const family = block.match(/font-family: '([^']+)'/)?.[1];
      const file = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)?.[1];
      const range = block.match(/unicode-range: ([^;]+);/)?.[1];
      const weight = Number(block.match(/font-weight: (\d+)/)?.[1]);
      if (!family || !file || !range || !weight) continue;
      const face = faces.get(file) ?? { family, file, range, weights: [] };
      face.weights.push(weight);
      faces.set(file, face);
    }

    const rules = await Promise.all(
      [...faces.values()].map(async (face) => {
        const weight = `${Math.min(...face.weights)} ${Math.max(...face.weights)}`;
        return `@font-face{font-family:'${face.family}';font-weight:${weight};src:url(${await fontFile(face.file)}) format('woff2');unicode-range:${face.range}}`;
      }),
    );
    return rules.join("\n");
  } catch (error) {
    // No internet: the image is still made, with a standard font
    console.warn("Fonts could not be embedded:", error);
    return "";
  }
}
