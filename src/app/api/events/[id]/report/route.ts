import { eventFor, notFound, notLoggedIn } from "@/lib/access";
import { getSession } from "@/lib/auth";
import { listEventDownloads, listResources, resourceStats } from "@/lib/store";

// GET /api/events/<id>/report                   one row per post: views, downloads, last download
// GET /api/events/<id>/report?type=downloads    one row per download, with member, page, device, IP
// Both come as a CSV file, which opens in Excel or Google Sheets.

// One CSV cell: wrapped in quotes, with quotes inside doubled
const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const csvRow = (values: unknown[]) => values.map(cell).join(",");

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return notLoggedIn();
  const event = await eventFor(session, (await params).id);
  if (!event) return notFound();

  const allDownloads = new URL(request.url).searchParams.get("type") === "downloads";
  const [resources, downloads] = await Promise.all([listResources(event.id), listEventDownloads(event.id)]);
  const names = new Map(resources.map((resource) => [resource.id, resource.name]));
  let rows: unknown[][];

  if (allDownloads) {
    rows = [
      ["Date", "Post", "Member ID", "Member name", "Format", "Downloaded from", "Device", "IP address", "User agent"],
      ...downloads.map((row) => [
        new Date(row.at).toLocaleString("en-AU"),
        names.get(row.resourceId),
        row.memberId,
        row.memberName,
        row.format.toUpperCase(),
        row.url,
        row.device,
        row.ip,
        row.userAgent,
      ]),
    ];
  } else {
    const stats = await resourceStats(resources.map((resource) => resource.id));
    rows = [
      ["Post", "Views", "Downloads", "Last downloaded"],
      ...resources.map((resource) => {
        const last = downloads.find((row) => row.resourceId === resource.id); // newest first
        return [
          resource.name,
          stats[resource.id].views,
          stats[resource.id].downloads,
          last ? new Date(last.at).toLocaleString("en-AU") : "",
        ];
      }),
    ];
  }

  // The \uFEFF mark at the start makes Excel read names with accents correctly
  const file = `${event.name} ${allDownloads ? "downloads" : "report"}.csv`.replace(/[^\w .-]/g, "");
  return new Response("\uFEFF" + rows.map(csvRow).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
    },
  });
}
