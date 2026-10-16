// Details about the visitor of a fundraising page, kept with each download and view.

/** Mobile, Tablet or Desktop, from the browser's user agent text */
export function deviceOf(userAgent: string): "Mobile" | "Tablet" | "Desktop" {
  if (/iPad|Tablet|PlayBook|Silk|Kindle|Android(?!.*Mobile)/i.test(userAgent)) return "Tablet";
  if (/Mobi|iPhone|iPod|Android|Windows Phone|BlackBerry/i.test(userAgent)) return "Mobile";
  return "Desktop";
}

/** Device, IP address and user agent of the browser that sent this request */
export function visitorOf(request: Request) {
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 500);
  // Behind a host or proxy, the visitor's address is the first one in x-forwarded-for
  const ip = (request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "").trim();
  return { device: deviceOf(userAgent), ip: ip.slice(0, 64) || undefined, userAgent: userAgent || undefined };
}

/**
 * The page address without ?query or #hash (they can hold personal details), or null if it is not a web address
 */
export function pageAddress(value: unknown): string | null {
  try {
    const parsed = new URL(String(value));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return (parsed.origin + parsed.pathname).slice(0, 500);
  } catch {
    return null;
  }
}
