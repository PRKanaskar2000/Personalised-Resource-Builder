"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ResourceCanvas } from "@/components/ResourceCanvas";
import { cloneDesign, newLayer } from "@/lib/design";
import { IMAGE_FIELDS, TEXT_FIELDS } from "@/lib/field-registry";
import type { AssetRecord, DesignDocument, Layer, NormalisedFundraiser, ResourceRecord } from "@/lib/types";
import styles from "./EditorShell.module.css";

interface Props {
  resource: ResourceRecord;
  fundraisers: NormalisedFundraiser[];
  assets: AssetRecord[];
  lockedLayerIds: string[];
}

const PRESETS = [
  { label: "Square 1080", width: 1080, height: 1080 },
  { label: "Story 1080×1920", width: 1080, height: 1920 },
  { label: "Landscape 1920×1080", width: 1920, height: 1080 },
  { label: "A4 poster", width: 1240, height: 1754 },
];

export function EditorShell({ resource, fundraisers, assets, lockedLayerIds }: Props) {
  const [design, setDesign] = useState<DesignDocument>(resource.design);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fundraiserId, setFundraiserId] = useState(fundraisers[0]?.individual.id ?? "");
  const [history, setHistory] = useState<DesignDocument[]>([resource.design]);
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [name, setName] = useState(resource.name);
  // Read the site origin after the page loads, so server and browser render the same HTML first
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const fundraiser = fundraisers.find((row) => row.individual.id === fundraiserId) ?? null;
  const selected = design.layers.find((layer) => layer.id === selectedId) ?? null;
  const scale = Math.min(0.62, 720 / design.canvas.width);

  function commit(next: DesignDocument) {
    const cloned = cloneDesign(next);
    const trail = history.slice(0, cursor + 1).concat(cloned);
    setHistory(trail);
    setCursor(trail.length - 1);
    setDesign(cloned);
  }

  function updateSelected(patch: Partial<Layer> | Record<string, unknown>) {
    if (!selected) return;
    commit({
      ...design,
      layers: design.layers.map((layer) =>
        layer.id === selected.id ? ({ ...layer, ...patch } as Layer) : layer,
      ),
    });
  }

  function add(type: Layer["type"]) {
    const layer = newLayer(type);
    commit({ ...design, layers: [...design.layers, layer] });
    setSelectedId(layer.id);
  }

  function moveLayer(id: string, x: number, y: number) {
    if (lockedLayerIds.includes(id)) return;
    setDesign((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === id ? { ...layer, x, y } : layer)),
    }));
  }

  function reorder(id: string, direction: -1 | 1) {
    const index = design.layers.findIndex((layer) => layer.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= design.layers.length) return;
    const layers = [...design.layers];
    const [item] = layers.splice(index, 1);
    layers.splice(nextIndex, 0, item);
    commit({ ...design, layers });
  }

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/resources/${resource.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, design }),
    });
    setSaving(false);
    setStatus(response.ok ? "Saved" : "Save failed");
  }

  async function download(kind: "svg" | "png") {
    if (kind === "svg") {
      window.open(`/api/render/${resource.id}?fundraiser=${fundraiserId}&format=svg`, "_blank");
      return;
    }
    const svg = await fetch(`/api/render/${resource.id}?fundraiser=${fundraiserId}&format=svg`).then((r) => r.text());
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = design.canvas.width;
      canvas.height = design.canvas.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${name}.png`;
      a.click();
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  async function uploadAsset(file: File) {
    const body = new FormData();
    body.append("file", file);
    const asset = (await fetch("/api/assets", { method: "POST", body }).then((r) => r.json())) as AssetRecord;
    const last = { ...newLayer("image"), source: asset.url, name: asset.name };
    commit({ ...design, layers: [...design.layers, last] });
    setSelectedId(last.id);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        const next = event.shiftKey ? cursor + 1 : cursor - 1;
        if (next < 0 || next >= history.length) return;
        setCursor(next);
        setDesign(history[next]);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const groupedFields = useMemo(() => {
    const groups = new Map<string, typeof TEXT_FIELDS>();
    for (const field of TEXT_FIELDS) {
      const list = groups.get(field.category) ?? [];
      list.push(field);
      groups.set(field.category, list);
    }
    return groups;
  }, []);

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${styles.left}`}>
        <Link href="/" className="eyebrow">
          Resources
        </Link>
        <input value={name} onChange={(event) => setName(event.target.value)} className={styles.nameInput} />
        <p className="muted">{status}</p>
        <div className={styles.addGroup}>
          <p className="eyebrow">Add layer</p>
          {(
            [
              ["text", "Text"],
              ["dynamic-text", "Dynamic text"],
              ["dynamic-image", "Dynamic photo"],
              ["rect", "Shape"],
              ["ellipse", "Circle"],
              ["progress-bar", "Progress"],
            ] as const
          ).map(([type, label]) => (
            <button
              key={type}
              onClick={() => add(type)}
              className={styles.addButton}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.layers}>
          <p className="eyebrow">Layers</p>
          <ul className={styles.layerList}>
            {[...design.layers].reverse().map((layer) => (
              <li key={layer.id}>
                <button
                  onClick={() => setSelectedId(layer.id)}
                  className={`${styles.layerRow} ${selectedId === layer.id ? styles.layerRowActive : ""}`}
                >
                  <span>{layer.name}</span>
                  <span className={styles.layerType}>
                    {layer.locked || lockedLayerIds.includes(layer.id) ? "lock" : layer.hidden ? "hide" : layer.type}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.toolbar}>
          <select
            value={`${design.canvas.width}x${design.canvas.height}`}
            onChange={(event) => {
              const preset = PRESETS.find((item) => `${item.width}x${item.height}` === event.target.value);
              if (!preset) return;
              commit({ ...design, canvas: { ...design.canvas, width: preset.width, height: preset.height } });
            }}
            className={styles.select}
          >
            {PRESETS.map((preset) => (
              <option key={preset.label} value={`${preset.width}x${preset.height}`}>
                {preset.label}
              </option>
            ))}
          </select>
          <label className={styles.inline}>
            Background
            <input
              type="color"
              value={design.canvas.background}
              onChange={(event) =>
                commit({ ...design, canvas: { ...design.canvas, background: event.target.value } })
              }
            />
          </label>
          <select
            value={fundraiserId}
            onChange={(event) => setFundraiserId(event.target.value)}
            className={styles.select}
          >
            {fundraisers.map((row) => (
              <option key={row.individual.id} value={row.individual.id}>
                Preview: {row.individual.firstName}
              </option>
            ))}
          </select>
          <div className={styles.toolbarActions}>
            <button onClick={() => download("svg")} className="btn btn-small btn-outline">
              SVG
            </button>
            <button onClick={() => download("png")} className="btn btn-small btn-outline">
              PNG
            </button>
            <button onClick={() => void save()} disabled={saving} className="btn btn-small btn-primary">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </header>
        <div className={styles.stage}>
          <ResourceCanvas
            design={design}
            fundraiser={fundraiser}
            scale={scale}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={moveLayer}
            interactive
          />
        </div>
      </main>

      <aside className={`${styles.sidebar} ${styles.right}`}>
        <p className="eyebrow">Inspector</p>
        {!selected && <p className={`muted ${styles.hint}`}>Select a layer to edit styles and dynamic fields.</p>}
        {selected && (
          <div className={styles.inspector}>
            <label className={styles.field}>
              Name
              <input
                className={styles.input}
                value={selected.name}
                onChange={(event) => updateSelected({ name: event.target.value })}
              />
            </label>
            {"fill" in selected && (
              <label className={styles.field}>
                Fill
                <input
                  type="color"
                  className={styles.colour}
                  value={selected.fill}
                  onChange={(event) => updateSelected({ fill: event.target.value })}
                />
              </label>
            )}
            {"style" in selected && (
              <>
                <label className={styles.field}>
                  Size
                  <input
                    type="number"
                    className={styles.input}
                    value={selected.style.fontSize}
                    onChange={(event) =>
                      updateSelected({ style: { ...selected.style, fontSize: Number(event.target.value) } })
                    }
                  />
                </label>
                <label className={styles.field}>
                  Colour
                  <input
                    type="color"
                    className={styles.colour}
                    value={selected.style.color}
                    onChange={(event) =>
                      updateSelected({ style: { ...selected.style, color: event.target.value } })
                    }
                  />
                </label>
                <label className={styles.field}>
                  Align
                  <select
                    className={styles.input}
                    value={selected.style.align}
                    onChange={(event) =>
                      updateSelected({
                        style: { ...selected.style, align: event.target.value as "left" | "center" | "right" },
                      })
                    }
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
              </>
            )}
            {selected.type === "text" && (
              <label className={styles.field}>
                Text
                <textarea
                  className={styles.input}
                  value={selected.text}
                  onChange={(event) => updateSelected({ text: event.target.value })}
                />
              </label>
            )}
            {selected.type === "dynamic-text" && (
              <>
                <label className={styles.field}>
                  Template
                  <textarea
                    className={styles.input}
                    value={selected.template}
                    onChange={(event) => updateSelected({ template: event.target.value })}
                  />
                </label>
                <div className={styles.fieldPicker}>
                  {[...groupedFields.entries()].map(([category, fields]) => (
                    <div key={category} className={styles.fieldGroup}>
                      <p className={styles.fieldCategory}>{category}</p>
                      {fields.map((field) => (
                        <button
                          key={field.path}
                          className={styles.chip}
                          onClick={() =>
                            updateSelected({
                              template: `${selected.template} {{${field.path}}}`.trim(),
                            })
                          }
                        >
                          {field.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
            {selected.type === "dynamic-image" && (
              <label className={styles.field}>
                Image field
                <select
                  className={styles.input}
                  value={selected.field}
                  onChange={(event) => updateSelected({ field: event.target.value })}
                >
                  {IMAGE_FIELDS.map((field) => (
                    <option key={field.path} value={field.path}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selected.type === "image" && (
              <div className={styles.assets}>
                <p>Assets</p>
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    className={styles.asset}
                    onClick={() => updateSelected({ source: asset.url })}
                  >
                    {asset.name}
                  </button>
                ))}
                <input type="file" accept="image/*" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadAsset(file);
                }} />
              </div>
            )}
            <div className={styles.row}>
              <button className={styles.smallButton} onClick={() => reorder(selected.id, 1)}>
                Forward
              </button>
              <button className={styles.smallButton} onClick={() => reorder(selected.id, -1)}>
                Back
              </button>
              <button
                className={styles.smallButton}
                onClick={() => updateSelected({ locked: !selected.locked })}
              >
                {selected.locked ? "Unlock" : "Lock"}
              </button>
              <button
                className={styles.smallButton}
                onClick={() => updateSelected({ hidden: !selected.hidden })}
              >
                {selected.hidden ? "Show" : "Hide"}
              </button>
            </div>
            <button
              className={styles.delete}
              onClick={() =>
                commit({ ...design, layers: design.layers.filter((layer) => layer.id !== selected.id) })
              }
            >
              Delete layer
            </button>
          </div>
        )}
        <div className={styles.embed}>
          <p className={styles.embedTitle}>Embed</p>
          <pre className={styles.code}>{`<div data-resource="${resource.id}" data-fundraiser="${fundraiserId}"></div>
<script src="${origin}/embed.js"></script>`}</pre>
        </div>
      </aside>
    </div>
  );
}
