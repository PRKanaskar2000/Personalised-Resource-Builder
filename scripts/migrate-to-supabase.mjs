// One-off: copy the data this app used to keep in files (data/*.json, public/uploads)
// into the Supabase database and storage.
//
//   node scripts/migrate-to-supabase.mjs
//
// Everything goes into one client and one event, which you can rename afterwards.
// It is safe to run again: it stops if that client already exists. The old files are left untouched.

import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const CLIENT = { name: "First client", username: "first-client" };
const EVENT_NAME = "First event";
const BUCKET = "uploads";

// Read .env.local (this script runs outside Next.js, which normally does that)
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback);
const check = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

const resources = readJson("data/resources.json", []);
const assets = readJson("data/assets.json", []);
const downloads = readJson("data/downloads.json", []);
const settings = readJson("data/settings.json", {});

const existing = check(await supabase.from("clients").select("id").eq("username", CLIENT.username).maybeSingle());
if (existing) {
  console.log(`"${CLIENT.name}" already exists, so nothing was copied.`);
  process.exit(0);
}

// The client gets a random password nobody knows. The admin sets a real one from the Clients page.
const salt = randomBytes(16);
const unusable = `scrypt$${salt.toString("base64url")}$${scryptSync(randomBytes(32), salt, 64).toString("base64url")}`;
const client = check(await supabase.from("clients").insert({ ...CLIENT, password_hash: unusable }).select().single());
const event = check(
  await supabase
    .from("events")
    .insert({
      client_id: client.id,
      name: EVENT_NAME,
      settings: { impacts: settings.impacts ?? [], customFields: settings.customFields ?? [] },
    })
    .select()
    .single(),
);
console.log(`Created client "${client.name}" and event "${event.name}".`);

// Uploaded images: put each file in storage and remember its new address
const { error: bucketError } = await supabase.storage.createBucket(BUCKET, { public: true });
if (bucketError && !/already exists/i.test(bucketError.message)) throw new Error(bucketError.message);

const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" };
const newAddress = new Map(); // "/uploads/abc.png" -> the public Supabase address
let copied = 0;
for (const asset of assets) {
  const file = path.join("public", asset.url);
  if (!existsSync(file)) {
    console.log(`  skipped image "${asset.name}": its file is missing`);
    continue;
  }
  const filePath = `${event.id}/${path.basename(asset.url)}`;
  const contentType = TYPES[path.extname(file).toLowerCase()] ?? asset.mimeType ?? "image/png";
  const { error } = await supabase.storage.from(BUCKET).upload(filePath, readFileSync(file), { contentType, upsert: true });
  if (error) throw new Error(`${asset.name}: ${error.message}`);
  const url = supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
  newAddress.set(asset.url, url);
  check(
    await supabase
      .from("assets")
      .insert({ id: asset.id, event_id: event.id, name: asset.name, mime_type: contentType, url, created_at: asset.createdAt })
      .select("id"),
  );
  copied++;
}
console.log(`Copied ${copied} of ${assets.length} images.`);

// Resources: the same designs, with image addresses pointing at the new storage
const moved = (url) => newAddress.get(url) ?? url;
const fixDesign = (design) => ({
  ...design,
  canvas: { ...design.canvas, backgroundImage: design.canvas.backgroundImage && moved(design.canvas.backgroundImage) },
  layers: design.layers.map((layer) => (layer.type === "image" ? { ...layer, source: moved(layer.source) } : layer)),
});
for (const resource of resources) {
  check(
    await supabase
      .from("resources")
      .insert({
        id: resource.id,
        event_id: event.id,
        name: resource.name,
        design: fixDesign(resource.design),
        versions: (resource.versions ?? []).slice(0, 20).map((version) => ({ ...version, design: fixDesign(version.design) })),
        created_at: resource.createdAt,
        updated_at: resource.updatedAt,
      })
      .select("id"),
  );
}
console.log(`Copied ${resources.length} resources.`);

// Download history, for the resources that still exist
const kept = downloads.filter((row) => resources.some((resource) => resource.id === row.resourceId));
if (kept.length) {
  check(
    await supabase
      .from("downloads")
      .insert(
        kept.map((row) => ({
          resource_id: row.resourceId,
          url: row.url,
          format: row.format,
          member_id: row.memberId ?? null,
          member_name: row.memberName ?? null,
          created_at: row.at,
        })),
      )
      .select("id"),
  );
}
console.log(`Copied ${kept.length} of ${downloads.length} download records.`);
console.log("Done. Log in as the admin to see it under Clients.");
