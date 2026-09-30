import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { defaultFundraisingPoster } from "./design";
import type { AssetRecord, ResourceRecord, TemplateRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  const full = path.join(DATA_DIR, file);
  try {
    const raw = await fs.readFile(full, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(full, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

async function writeJson(file: string, value: unknown) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(value, null, 2));
}

function seedResources(): ResourceRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: "resource_challenge_poster",
      name: "City Challenge poster",
      organisationId: "org_demo",
      campaignId: "campaign_city",
      templateId: "tpl_challenge",
      design: defaultFundraisingPoster(),
      createdAt: now,
      updatedAt: now,
      versions: [{ at: now, design: defaultFundraisingPoster() }],
    },
  ];
}

function seedTemplates(): TemplateRecord[] {
  return [
    {
      id: "tpl_challenge",
      name: "Challenge poster",
      description: "Square fundraiser poster with photo, story line, and progress.",
      design: defaultFundraisingPoster(),
      lockedLayerIds: ["wash"],
      createdAt: new Date().toISOString(),
    },
  ];
}

export async function listResources() {
  return readJson<ResourceRecord[]>("resources.json", seedResources());
}

export async function getResource(id: string) {
  const rows = await listResources();
  return rows.find((row) => row.id === id) ?? null;
}

export async function saveResource(resource: ResourceRecord) {
  const rows = await listResources();
  const index = rows.findIndex((row) => row.id === resource.id);
  if (index >= 0) rows[index] = resource;
  else rows.unshift(resource);
  await writeJson("resources.json", rows);
  return resource;
}

export async function createResource(name: string, template?: TemplateRecord) {
  const now = new Date().toISOString();
  const design = template ? JSON.parse(JSON.stringify(template.design)) : defaultFundraisingPoster();
  const resource: ResourceRecord = {
    id: `resource_${nanoid(8)}`,
    name,
    organisationId: "org_demo",
    campaignId: "campaign_city",
    templateId: template?.id,
    design,
    createdAt: now,
    updatedAt: now,
    versions: [{ at: now, design }],
  };
  return saveResource(resource);
}

export async function listTemplates() {
  return readJson<TemplateRecord[]>("templates.json", seedTemplates());
}

export async function getTemplate(id: string) {
  const rows = await listTemplates();
  return rows.find((row) => row.id === id) ?? null;
}

export async function listAssets() {
  return readJson<AssetRecord[]>("assets.json", []);
}

export async function addAsset(asset: AssetRecord) {
  const rows = await listAssets();
  rows.unshift(asset);
  await writeJson("assets.json", rows);
  return asset;
}
