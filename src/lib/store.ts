import path from "path";
import { nanoid } from "nanoid";
import { defaultDesign } from "./design";
import { supabase, UPLOADS_BUCKET } from "./supabase";
import { shiftRanges } from "./text-ranges";
import type {
  AppSettings,
  AssetRecord,
  ClientRecord,
  DesignDocument,
  DownloadRecord,
  EventRecord,
  ResourceRecord,
} from "./types";

// Everything the app saves, kept in the Supabase database:
//   client -> events -> resources, uploaded images, settings;  resource -> downloads
// These functions only read and write. Checking WHO may read or write is done in access.ts.

// Supabase answers with { data, error }; this returns the data, or stops with the error
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

// Client and event ids are UUIDs. Anything else cannot exist, so it is not even looked up.
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// ---- Clients ----
// Database rows arrive untyped (`any`); each to… function below converts one into the app's own type.
const toClient = (row: any): ClientRecord => ({
  id: row.id,
  name: row.name,
  username: row.username,
  createdAt: row.created_at,
});

export async function listClients(): Promise<ClientRecord[]> {
  return unwrap(await supabase.from("clients").select("id, name, username, created_at").order("name")).map(toClient);
}

export async function getClient(id: string): Promise<ClientRecord | null> {
  if (!isUuid(id)) return null;
  const row = unwrap(await supabase.from("clients").select("id, name, username, created_at").eq("id", id).maybeSingle());
  return row ? toClient(row) : null;
}

/** For logging in: the client with this username and their stored password hash */
export async function findClientLogin(username: string): Promise<{ client: ClientRecord; passwordHash: string } | null> {
  const row: any = unwrap(await supabase.from("clients").select("*").eq("username", username).maybeSingle());
  return row ? { client: toClient(row), passwordHash: row.password_hash } : null;
}

export async function createClient(name: string, username: string, passwordHash: string): Promise<ClientRecord> {
  const row = unwrap(
    await supabase.from("clients").insert({ name, username, password_hash: passwordHash }).select().single(),
  );
  return toClient(row);
}

/** Change a client's name, username or password; only the ones given are changed */
export async function updateClient(id: string, changes: { name?: string; username?: string; passwordHash?: string }) {
  const { passwordHash, ...rest } = changes;
  const row = unwrap(
    await supabase
      .from("clients")
      .update(passwordHash ? { ...rest, password_hash: passwordHash } : rest)
      .eq("id", id)
      .select()
      .single(),
  );
  return toClient(row);
}

/** Delete a client with all their events, resources, images and download history */
export async function deleteClient(id: string) {
  for (const event of await listEvents(id)) await deleteEventFiles(event.id);
  unwrap(await supabase.from("clients").delete().eq("id", id).select("id")); // the database removes the rest
}

// ---- Events (folders) and their settings ----
const DEFAULT_SETTINGS: AppSettings = {
  impacts: [{ key: "calls", name: "Calls", amount: 39 }],
  customFields: [],
};

// Settings saved in the database may be empty or from an older version; fill in what is missing
function toSettings(saved: any): AppSettings {
  return {
    impacts: Array.isArray(saved?.impacts) ? saved.impacts : DEFAULT_SETTINGS.impacts,
    customFields: Array.isArray(saved?.customFields) ? saved.customFields : DEFAULT_SETTINGS.customFields,
  };
}

const toEvent = (row: any): EventRecord => ({
  id: row.id,
  clientId: row.client_id,
  name: row.name,
  settings: toSettings(row.settings),
  createdAt: row.created_at,
});

export async function listEvents(clientId: string): Promise<EventRecord[]> {
  if (!isUuid(clientId)) return [];
  return unwrap(await supabase.from("events").select("*").eq("client_id", clientId).order("created_at")).map(toEvent);
}

export async function getEvent(id: string): Promise<EventRecord | null> {
  if (!isUuid(id)) return null;
  const row = unwrap(await supabase.from("events").select("*").eq("id", id).maybeSingle());
  return row ? toEvent(row) : null;
}

export async function createEvent(clientId: string, name: string, settings: AppSettings = DEFAULT_SETTINGS) {
  return toEvent(unwrap(await supabase.from("events").insert({ client_id: clientId, name, settings }).select().single()));
}

export async function renameEvent(id: string, name: string) {
  return toEvent(unwrap(await supabase.from("events").update({ name }).eq("id", id).select().single()));
}

/** Delete an event with its resources and download history */
export async function deleteEvent(id: string) {
  const event = await getEvent(id);
  if (!event) return;
  // Images are shared by all of the client's events, so they move to another event of the client.
  // Only when this is the client's last event are the images deleted with it.
  const other = (await listEvents(event.clientId)).find((item) => item.id !== id);
  if (other) unwrap(await supabase.from("assets").update({ event_id: other.id }).eq("event_id", id).select("id"));
  else await deleteEventFiles(id);
  unwrap(await supabase.from("events").delete().eq("id", id).select("id"));
}

export async function saveSettings(eventId: string, settings: AppSettings): Promise<AppSettings> {
  unwrap(await supabase.from("events").update({ settings }).eq("id", eventId).select("id"));
  return settings;
}

// ---- Resources (designs) ----
const toResource = (row: any): ResourceRecord => ({
  id: row.id,
  eventId: row.event_id,
  name: row.name,
  design: row.design,
  versions: row.versions ?? [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function listResources(eventId: string): Promise<ResourceRecord[]> {
  if (!isUuid(eventId)) return [];
  const rows = unwrap(
    await supabase.from("resources").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
  );
  return rows.map(toResource);
}

export async function getResource(id: string): Promise<ResourceRecord | null> {
  const row = unwrap(await supabase.from("resources").select("*").eq("id", id).maybeSingle());
  return row ? toResource(row) : null;
}

export async function saveResource(resource: ResourceRecord) {
  unwrap(
    await supabase
      .from("resources")
      .update({
        name: resource.name,
        design: resource.design,
        versions: resource.versions,
        updated_at: resource.updatedAt,
      })
      .eq("id", resource.id)
      .select("id"),
  );
  return resource;
}

/**
 * A name no other resource of the event has. If "Poster" is taken it becomes "Poster 1", then "Poster 2"…
 * `exceptId` is the resource being renamed, whose own name does not count as taken.
 */
export async function uniqueResourceName(eventId: string, name: string, exceptId?: string): Promise<string> {
  const taken = new Set(
    (await listResources(eventId)).filter((resource) => resource.id !== exceptId).map((resource) => resource.name.toLowerCase()),
  );
  if (!taken.has(name.toLowerCase())) return name;
  let number = 1;
  while (taken.has(`${name} ${number}`.toLowerCase())) number++;
  return `${name} ${number}`;
}

/** A new resource in an event, starting from the default design (see design.ts) */
export async function createResource(eventId: string, name: string, design: DesignDocument = defaultDesign()) {
  const now = new Date().toISOString();
  const row = unwrap(
    await supabase
      .from("resources")
      .insert({ id: `resource_${nanoid(10)}`, event_id: eventId, name, design, versions: [{ at: now, design }] })
      .select()
      .single(),
  );
  return toResource(row);
}

/** Remove a resource; the database removes its download history with it */
export async function deleteResource(id: string) {
  unwrap(await supabase.from("resources").delete().eq("id", id).select("id"));
}

/**
 * A variable was renamed in an event's settings: change it in every design of that event,
 * so "{{impact.calls}}" becomes "{{impact.nights}}" and nothing goes blank.
 * `renames` maps old name to new name, e.g. { "impact.calls": "impact.nights" }.
 */
export async function renameFields(eventId: string, renames: Record<string, string>) {
  if (Object.keys(renames).length === 0) return;
  const TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;
  for (const resource of await listResources(eventId)) {
    let changed = false;
    for (const layer of resource.design.layers) {
      if (layer.type === "dynamic-text") {
        // Change one {{variable}} at a time, from the end of the text backwards, so the positions
        // of the earlier ones do not move and styled words can be kept on the right words
        const tokens = [...layer.template.matchAll(TOKEN)].reverse();
        for (const token of tokens) {
          const renamed = renames[token[1].trim()];
          if (!renamed) continue;
          const before = layer.template;
          layer.template = before.slice(0, token.index) + `{{${renamed}}}` + before.slice(token.index + token[0].length);
          if (layer.ranges?.length) layer.ranges = shiftRanges(layer.ranges, before, layer.template);
          changed = true;
        }
      } else if ((layer.type === "dynamic-image" || layer.type === "progress-bar") && renames[layer.field]) {
        layer.field = renames[layer.field];
        changed = true;
      }
    }
    if (changed) await saveResource(resource);
  }
}

// ---- Uploaded images ----
const toAsset = (row: any): AssetRecord => ({
  id: row.id,
  eventId: row.event_id,
  name: row.name,
  mimeType: row.mime_type,
  url: row.url,
  createdAt: row.created_at,
});

// Where an image's file sits in storage, worked out from its public address
const storagePath = (url: string) => url.split(`/object/public/${UPLOADS_BUCKET}/`)[1];

export async function listAssets(eventId: string): Promise<AssetRecord[]> {
  if (!isUuid(eventId)) return [];
  const rows = unwrap(
    await supabase.from("assets").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
  );
  return rows.map(toAsset);
}

/** A client's image library: the images of all their events, newest first */
export async function listClientAssets(clientId: string): Promise<AssetRecord[]> {
  const eventIds = (await listEvents(clientId)).map((event) => event.id);
  if (eventIds.length === 0) return [];
  const rows = unwrap(
    await supabase.from("assets").select("*").in("event_id", eventIds).order("created_at", { ascending: false }),
  );
  return rows.map(toAsset);
}

export async function getAsset(id: string): Promise<AssetRecord | null> {
  const row = unwrap(await supabase.from("assets").select("*").eq("id", id).maybeSingle());
  return row ? toAsset(row) : null;
}

/** Save an uploaded image: the file goes to storage (in the event's own folder), its details to the database */
export async function addAsset(eventId: string, file: { name: string; type: string; bytes: Buffer }) {
  const id = nanoid(10);
  const filePath = `${eventId}/${id}${path.extname(file.name).toLowerCase() || ".png"}`;
  const upload = () =>
    supabase.storage.from(UPLOADS_BUCKET).upload(filePath, file.bytes, { contentType: file.type || "image/png" });

  let { error } = await upload();
  if (error && /not found/i.test(error.message)) {
    // First upload ever: create the bucket. It is public so images can be shown on fundraising pages.
    await supabase.storage.createBucket(UPLOADS_BUCKET, { public: true });
    ({ error } = await upload());
  }
  if (error) throw new Error(error.message);

  const url = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(filePath).data.publicUrl;
  const row = unwrap(
    await supabase
      .from("assets")
      .insert({ id: `asset_${id}`, event_id: eventId, name: file.name, mime_type: file.type || "image/png", url })
      .select()
      .single(),
  );
  return toAsset(row);
}

/**
 * Delete an uploaded image: its record and its file.
 * Refused while any resource of the client still uses it; `usedBy` then lists those resources.
 */
export async function deleteAsset(asset: AssetRecord): Promise<{ deleted: boolean; usedBy: string[] }> {
  // The image can be used in any event of the same client, so look through all of them
  const event = await getEvent(asset.eventId);
  const events = event ? await listEvents(event.clientId) : [];
  const resources = (await Promise.all(events.map((item) => listResources(item.id)))).flat();
  const usedBy = resources
    .filter(
      (resource) =>
        resource.design.canvas.backgroundImage === asset.url ||
        resource.design.layers.some((layer) => layer.type === "image" && layer.source === asset.url),
    )
    .map((resource) => resource.name);
  if (usedBy.length > 0) return { deleted: false, usedBy };

  unwrap(await supabase.from("assets").delete().eq("id", asset.id).select("id"));
  const filePath = storagePath(asset.url);
  if (filePath) await supabase.storage.from(UPLOADS_BUCKET).remove([filePath]);
  return { deleted: true, usedBy: [] };
}

// Remove the files of every image an event holds (the database removes their rows with the event)
async function deleteEventFiles(eventId: string) {
  const paths = (await listAssets(eventId)).map((asset) => storagePath(asset.url)).filter(Boolean);
  if (paths.length) await supabase.storage.from(UPLOADS_BUCKET).remove(paths);
}

// ---- Downloads: one row each time someone downloads a resource ----
export async function listDownloads(resourceId: string): Promise<DownloadRecord[]> {
  const rows = unwrap(await supabase.from("downloads").select("*").eq("resource_id", resourceId).order("created_at"));
  return rows.map((row: any) => ({
    resourceId: row.resource_id,
    url: row.url,
    format: row.format,
    at: row.created_at,
    memberId: row.member_id ?? undefined,
    memberName: row.member_name ?? undefined,
  }));
}

export async function addDownload(download: DownloadRecord) {
  unwrap(
    await supabase
      .from("downloads")
      .insert({
        resource_id: download.resourceId,
        url: download.url,
        format: download.format,
        member_id: download.memberId ?? null,
        member_name: download.memberName ?? null,
      })
      .select("id"),
  );
}
