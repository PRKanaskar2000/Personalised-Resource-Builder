import { promises as fs } from "fs";
import path from "path";

// An exported image cannot load other files, so every picture it uses
// is copied into it as a data: URL.

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/** The picture at this address as a data: URL, or null if it cannot be used */
export async function imageDataUrl(href: string): Promise<string | null> {
  try {
    if (href.startsWith("data:image/")) return href;

    // Our own uploads are read straight from disk
    if (href.startsWith("/uploads/")) {
      const file = path.join(process.cwd(), "public", "uploads", path.basename(href));
      const type = TYPES[path.extname(file).toLowerCase()];
      if (!type) return null;
      return `data:${type};base64,${(await fs.readFile(file)).toString("base64")}`;
    }

    // Other images (e.g. profile photos) must be public https files, not local network addresses
    const url = new URL(href);
    const isLocal = url.hostname === "localhost" || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":");
    if (url.protocol !== "https:" || isLocal) return null;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const type = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !type.startsWith("image/")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
