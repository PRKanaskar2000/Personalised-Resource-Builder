"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ResourceCanvas, type LayerBox } from "@/components/ResourceCanvas";
import { cloneDesign, newLayer } from "@/lib/design";
import { DOWNLOAD_FORMATS, downloadSvgAs, type DownloadFormat } from "@/lib/download";
import { EMBED_PLATFORMS, embedCode, usedCustomFields, type EmbedPlatform } from "@/lib/embed-code";
import { IMAGE_FIELDS, TEXT_FIELDS } from "@/lib/field-registry";
import { FONTS, WEIGHT_NAMES, nearestWeight, weightsOf } from "@/lib/fonts";
import { addRange, shiftRanges, type RangeStyle } from "@/lib/text-ranges";
import type {
  AppSettings,
  AssetRecord,
  DesignDocument,
  DownloadRecord,
  Layer,
  LetterCase,
  NormalisedFundraiser,
  ResourceRecord,
} from "@/lib/types";
import styles from "./EditorShell.module.css";

interface Props {
  resource: ResourceRecord;
  fundraisers: NormalisedFundraiser[];
  assets: AssetRecord[];
  /** The variables managed on the home page: impact units and custom variables */
  settings: AppSettings;
}

interface DownloadStats {
  total: number;
  pages: { url: string; count: number }[];
  downloads: DownloadRecord[];
}

// Sizes offered for selected words (the whole text's size is typed in the Font size box)
const WORD_SIZES = [20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96, 110, 120, 140, 160, 200];

const LETTER_CASES: { value: LetterCase; label: string }[] = [
  { value: "none", label: "As typed" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "lowercase", label: "lowercase" },
  { value: "capitalize", label: "Capitalise Words" },
];

// "walking_reason" -> "Walking Reason": the sample text shown for a custom field
const titleCase = (name: string) => name.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

// Layer types that can have a border
const BORDER_TYPES = ["rect", "ellipse", "image", "dynamic-image"];

const PRESETS = [
  { label: "Square 1080", width: 1080, height: 1080 },
  { label: "Story 1080×1920", width: 1080, height: 1920 },
  { label: "Landscape 1920×1080", width: 1920, height: 1080 },
  { label: "A4 poster", width: 1240, height: 1754 },
];

// What an image picked in the image library is for
type ImageUse = "layer" | "background" | "replace";

// How far each arrow key moves a layer, in canvas pixels
const ARROWS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

export function EditorShell({ resource, fundraisers, assets, settings }: Props) {
  const { impacts, customFields } = settings;
  const [design, setDesign] = useState<DesignDocument>(resource.design);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sample = fundraisers[0] ?? null;
  const fundraiserId = sample?.individual.id ?? "";
  const [history, setHistory] = useState<DesignDocument[]>([resource.design]);
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [name, setName] = useState(resource.name);
  // Read the site origin after the page loads, so server and browser render the same HTML first
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const [assetList, setAssetList] = useState(assets);
  const [platform, setPlatform] = useState<EmbedPlatform>("funraisin");
  const [copied, setCopied] = useState(false);
  const [downloads, setDownloads] = useState<DownloadStats>({ total: 0, pages: [], downloads: [] });
  const downloadDialog = useRef<HTMLDialogElement>(null);
  const textInput = useRef<HTMLTextAreaElement>(null);
  // The image library pop-up, and what the image picked in it is for
  const imageDialog = useRef<HTMLDialogElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageUse, setImageUse] = useState<ImageUse>("layer");
  // Always holds the newest design, for code that runs after a drag ends
  const designRef = useRef(design);
  designRef.current = design;

  const selected = design.layers.find((layer) => layer.id === selectedId) ?? null;
  // The canvas is drawn at "fit" size times the zoom. Zooming changes only the canvas, not the panels.
  const [zoom, setZoom] = useState(1);
  const fitScale = Math.min(0.62, 720 / design.canvas.width);
  const scale = fitScale * zoom;
  const changeZoom = (factor: number) => setZoom((value) => Math.min(6, Math.max(0.25, value * factor)));
  const stage = useRef<HTMLDivElement>(null);

  // Ctrl + mouse wheel (or a trackpad pinch) over the canvas zooms the canvas instead of the whole page
  useEffect(() => {
    const area = stage.current;
    if (!area) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      changeZoom(event.deltaY < 0 ? 1.1 : 1 / 1.1);
    };
    area.addEventListener("wheel", onWheel, { passive: false });
    return () => area.removeEventListener("wheel", onWheel);
  }, []);

  // The dummy values shown on the canvas ("User Name", "Team Name"…).
  // A custom field with no sample value shows its own name: walking_reason -> "Walking Reason".
  const fundraiser = useMemo(() => {
    if (!sample) return null;
    const placeholders = Object.fromEntries(usedCustomFields(design).map((field) => [field, titleCase(field)]));
    return { ...sample, custom: { ...placeholders, ...sample.custom } };
  }, [sample, design]);

  const embed = embedCode(platform, resource.id, design, origin, fundraiserId);

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

  function add(type: Layer["type"], label: string) {
    const layer = newLayer(type, label);
    commit({ ...design, layers: [...design.layers, layer] });
    setSelectedId(layer.id);
  }

  function moveLayer(id: string, x: number, y: number) {
    setDesign((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === id ? { ...layer, x, y } : layer)),
    }));
  }

  function rotateLayer(id: string, rotation: number) {
    setDesign((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === id ? { ...layer, rotation } : layer)),
    }));
  }

  function resizeLayer(id: string, box: LayerBox) {
    setDesign((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === id ? { ...layer, ...box } : layer)),
    }));
  }

  // A drag or resize updates the design many times; save one undo step when it ends
  function finishDrag() {
    if (designRef.current !== history[cursor]) commit(designRef.current);
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
    // The server adds a number when another resource already has this name ("Poster 1")
    if (response.ok) setName(((await response.json()) as ResourceRecord).name);
  }

  // How many times this resource was downloaded, and from which pages
  async function loadDownloads() {
    setDownloads(await fetch(`/api/downloads/${resource.id}`).then((r) => r.json()));
  }
  useEffect(() => {
    void loadDownloads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function download(format: DownloadFormat) {
    await save(); // the download is made from the saved design
    const svg = await fetch(`/api/render/${resource.id}?fundraiser=${fundraiserId}`).then((r) => r.text());
    await downloadSvgAs(svg, format, name, design.canvas.width, design.canvas.height);
    // Count it against this page's address
    await fetch(`/api/downloads/${resource.id}`, {
      method: "POST",
      body: JSON.stringify({
        url: window.location.href,
        format,
        // The fundraiser chosen in "Preview"
        memberId: fundraiser?.individual.id,
        memberName: fundraiser?.individual.fullName,
      }),
    });
    void loadDownloads();
  }

  // Read the file chosen in a file input, then clear the input so the same file can be picked again
  function pickedFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    return file;
  }

  async function uploadAsset(file: File) {
    const body = new FormData();
    body.append("file", file);
    body.append("eventId", resource.eventId);
    const response = await fetch("/api/assets", { method: "POST", body });
    if (!response.ok) {
      const { error } = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus(error ?? "Could not upload the image");
      throw new Error(error ?? "Upload failed");
    }
    const asset = (await response.json()) as AssetRecord;
    setAssetList((list) => [asset, ...list]);
    return asset;
  }

  // Open the image library. `use` says what the picked image is for:
  // a new layer, the canvas background, or replacing the selected image layer.
  function openImages(use: ImageUse) {
    setImageUse(use);
    imageDialog.current?.showModal();
  }

  function pickImage(asset: AssetRecord) {
    if (imageUse === "layer") addImageLayer(asset);
    else if (imageUse === "background") setBackgroundImage(asset.url);
    else updateSelected({ source: asset.url });
    imageDialog.current?.close();
  }

  // Add an image as a new layer, keeping the picture's own shape (at most 400px wide)
  function addImageLayer(asset: AssetRecord) {
    const image = new Image();
    image.onload = () => {
      const width = Math.min(400, image.naturalWidth);
      const height = Math.round((width * image.naturalHeight) / image.naturalWidth);
      const layer = { ...newLayer("image"), source: asset.url, name: asset.name, width, height, radius: 0 };
      commit({ ...designRef.current, layers: [...designRef.current.layers, layer] });
      setSelectedId(layer.id);
    };
    image.src = asset.url;
  }

  // Delete an uploaded image from the library (the server refuses if a resource still uses it)
  async function removeAsset(asset: AssetRecord) {
    if (!window.confirm(`Delete the image "${asset.name}"? This cannot be undone.`)) return;
    const response = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
    if (response.ok) {
      setAssetList((list) => list.filter((item) => item.id !== asset.id));
      setStatus("Image deleted");
    } else if (response.status === 409) {
      const { usedBy } = (await response.json()) as { usedBy: string[] };
      window.alert(`This image is used by: ${usedBy.join(", ")}.\nRemove it from there first (and save), then delete it.`);
    } else {
      setStatus("Could not delete the image");
    }
  }

  function setBackgroundImage(url?: string) {
    commit({ ...design, canvas: { ...design.canvas, backgroundImage: url } });
  }

  function deleteSelected() {
    if (!selected) return;
    commit({ ...design, layers: design.layers.filter((layer) => layer.id !== selected.id) });
    setSelectedId(null);
  }

  // Put the selected layer in the middle of the canvas, left-to-right or top-to-bottom
  function centre(direction: "horizontal" | "vertical") {
    if (!selected) return;
    if (direction === "horizontal") updateSelected({ x: Math.round((design.canvas.width - selected.width) / 2) });
    else updateSelected({ y: Math.round((design.canvas.height - selected.height) / 2) });
  }

  // Change the words of a text layer, keeping any styled parts on the right words
  function updateText(value: string) {
    if (!selected || !("style" in selected)) return;
    if (selected.type === "text") {
      updateSelected({ text: value, ranges: shiftRanges(selected.ranges, selected.text, value) });
    } else {
      updateSelected({ template: value, ranges: shiftRanges(selected.ranges, selected.template, value) });
    }
  }

  // Give the words selected in the text box their own colour, font or weight
  function styleSelection(style: RangeStyle) {
    const box = textInput.current;
    if (!selected || !("style" in selected) || !box) return;
    if (box.selectionEnd <= box.selectionStart) {
      setStatus("Select some words in the text box first");
      return;
    }
    updateSelected({ ranges: addRange(selected.ranges, box.selectionStart, box.selectionEnd, style) });
    setStatus("Styled the selected words");
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
      // Ctrl and + / - / 0 zoom the canvas (the browser would otherwise zoom the whole page)
      if ((event.metaKey || event.ctrlKey) && ["=", "+", "-", "0"].includes(event.key)) {
        event.preventDefault();
        if (event.key === "0") setZoom(1);
        else changeZoom(event.key === "-" ? 1 / 1.25 : 1.25);
      }
      // Delete key removes the selected layer, but not while typing in a box
      const typing = event.target instanceof Element && event.target.closest("input, textarea, select");
      if (event.key === "Delete" && !typing && selected) {
        event.preventDefault();
        deleteSelected();
      }
      // Arrow keys move the selected layer by 1px, or by 10px with Shift held
      const arrow = ARROWS[event.key];
      if (arrow && !typing && selected && !selected.locked && !imageDialog.current?.open) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        updateSelected({ x: selected.x + arrow.x * step, y: selected.y + arrow.y * step });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // The image the library should mark as "in use" for what is being picked
  const currentImage =
    imageUse === "background" ? design.canvas.backgroundImage : selected?.type === "image" ? selected.source : undefined;

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
        {/* Back to the event this resource belongs to */}
        <Link href={`/events/${resource.eventId}`} className="eyebrow">
          ← Resources
        </Link>
        <input value={name} onChange={(event) => setName(event.target.value)} className={styles.nameInput} />
        <p className="muted">{status}</p>
        <div className={styles.addGroup}>
          <p className="eyebrow">Add layer</p>
          {(
            [
              ["text", "Text"],
              ["dynamic-text", "Dynamic text"],
              ["dynamic-image", "User photo"],
              ["rect", "Shape"],
              ["ellipse", "Circle"],
              ["progress-bar", "Progress"],
            ] as const
          ).map(([type, label]) => (
            <button
              key={type}
              onClick={() => add(type, label)}
              className={styles.addButton}
            >
              {label}
            </button>
          ))}
          <button onClick={() => openImages("layer")} className={styles.addButton}>
            Image
          </button>
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
                    {layer.locked ? "lock" : layer.hidden ? "hide" : layer.type}
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
          <button onClick={() => openImages("background")} className="btn btn-small btn-outline">
            {design.canvas.backgroundImage ? "Change image" : "Background image"}
          </button>
          {design.canvas.backgroundImage && (
            <button onClick={() => setBackgroundImage(undefined)} className={styles.textButton}>
              Remove
            </button>
          )}
          {/* Canvas zoom: the percentage is the canvas size compared with the real image */}
          <div className={styles.zoom}>
            <button onClick={() => changeZoom(1 / 1.25)} aria-label="Zoom out" title="Zoom out (Ctrl -)">
              −
            </button>
            <button onClick={() => setZoom(1)} title="Back to fit (Ctrl 0)" className={styles.zoomValue}>
              {Math.round(scale * 100)}%
            </button>
            <button onClick={() => changeZoom(1.25)} aria-label="Zoom in" title="Zoom in (Ctrl +)">
              +
            </button>
          </div>
          <div className={styles.toolbarActions}>
            {/* Choosing a format downloads it; the menu then goes back to "Download" */}
            <select
              value=""
              onChange={(event) => void download(event.target.value as DownloadFormat)}
              className={styles.select}
              aria-label="Download"
            >
              <option value="" disabled>
                Download
              </option>
              {DOWNLOAD_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format.toUpperCase()}
                </option>
              ))}
            </select>
            <button onClick={() => void save()} disabled={saving} className="btn btn-small btn-primary">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </header>
        <div className={styles.stage} ref={stage}>
          <ResourceCanvas
            design={design}
            fundraiser={fundraiser}
            scale={scale}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={moveLayer}
            onResize={resizeLayer}
            onRotate={rotateLayer}
            onChangeEnd={finishDrag}
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
            {/* Put the layer in the middle of the canvas */}
            <div className={styles.field}>
              Centre on canvas
              <div className={styles.row}>
                <button className={styles.smallButton} onClick={() => centre("horizontal")}>
                  ↔ Horizontally
                </button>
                <button className={styles.smallButton} onClick={() => centre("vertical")}>
                  ↕ Vertically
                </button>
              </div>
            </div>
            {/* Tilt: the same angle the round handle above the layer changes */}
            <label className={styles.field}>
              Rotation (°)
              <input
                type="number"
                min={-180}
                max={180}
                className={styles.input}
                value={selected.rotation}
                onChange={(event) => updateSelected({ rotation: Math.max(-180, Math.min(180, Number(event.target.value))) })}
              />
            </label>
            {/* Exact size in pixels, for shapes and images. Text is sized with the handles on the canvas. */}
            {!("style" in selected) && (
              <div className={styles.sizeRow}>
                <label className={styles.field}>
                  Width
                  <input
                    type="number"
                    min={1}
                    className={styles.input}
                    value={selected.width}
                    onChange={(event) => updateSelected({ width: Math.max(1, Number(event.target.value)) })}
                  />
                </label>
                <label className={styles.field}>
                  Height
                  <input
                    type="number"
                    min={1}
                    className={styles.input}
                    value={selected.height}
                    onChange={(event) => updateSelected({ height: Math.max(1, Number(event.target.value)) })}
                  />
                </label>
              </div>
            )}
            {/* Rounded corners. A circle is always fully round, so it has no radius box. */}
            {"radius" in selected && (
              <label className={styles.field}>
                Corner radius (px)
                <input
                  type="number"
                  min={0}
                  className={styles.input}
                  value={selected.radius}
                  onChange={(event) => updateSelected({ radius: Math.max(0, Number(event.target.value)) })}
                />
              </label>
            )}
            {BORDER_TYPES.includes(selected.type) && (
              <div className={styles.sizeRow}>
                <label className={styles.field}>
                  Border (px)
                  <input
                    type="number"
                    min={0}
                    className={styles.input}
                    value={selected.borderWidth ?? 0}
                    onChange={(event) => updateSelected({ borderWidth: Math.max(0, Number(event.target.value)) })}
                  />
                </label>
                <label className={styles.field}>
                  Border colour
                  <input
                    type="color"
                    className={styles.colourBlock}
                    value={selected.borderColor ?? "#1A1915"}
                    onChange={(event) => updateSelected({ borderColor: event.target.value })}
                  />
                </label>
              </div>
            )}
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
                <div className={styles.sizeRow}>
                  <label className={styles.field}>
                    Font
                    <select
                      className={styles.input}
                      value={selected.style.fontFamily}
                      onChange={(event) =>
                        updateSelected({
                          style: {
                            ...selected.style,
                            fontFamily: event.target.value,
                            // keep the weight if the new font has it, else use its closest one
                            fontWeight: nearestWeight(event.target.value, selected.style.fontWeight),
                          },
                        })
                      }
                    >
                      {FONTS.map((font) => (
                        <option key={font.family} value={font.family} style={{ fontFamily: font.family }}>
                          {font.family}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    Weight
                    <select
                      className={styles.input}
                      value={selected.style.fontWeight}
                      onChange={(event) =>
                        updateSelected({ style: { ...selected.style, fontWeight: Number(event.target.value) } })
                      }
                    >
                      {weightsOf(selected.style.fontFamily).map((weight) => (
                        <option key={weight} value={weight}>
                          {WEIGHT_NAMES[weight] ?? weight}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={styles.sizeRow}>
                  <label className={styles.field}>
                    Font size
                    <input
                      type="number"
                      className={styles.input}
                      value={selected.style.fontSize}
                      onChange={(event) =>
                        updateSelected({ style: { ...selected.style, fontSize: Number(event.target.value) } })
                      }
                    />
                  </label>
                  {/* Changes how the letters are shown, including values that come from Funraisin */}
                  <label className={styles.field}>
                    Letter case
                    <select
                      className={styles.input}
                      value={selected.style.textTransform ?? "none"}
                      onChange={(event) =>
                        updateSelected({ style: { ...selected.style, textTransform: event.target.value as LetterCase } })
                      }
                    >
                      {LETTER_CASES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
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
                  ref={textInput}
                  rows={3}
                  className={styles.input}
                  value={selected.text}
                  onChange={(event) => updateText(event.target.value)}
                />
              </label>
            )}
            {selected.type === "dynamic-text" && (
              <>
                <label className={styles.field}>
                  Template
                  <textarea
                    ref={textInput}
                    rows={3}
                    className={styles.input}
                    value={selected.template}
                    onChange={(event) => updateText(event.target.value)}
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
                          onClick={() => updateText(`${selected.template} {{${field.path}}}`.trim())}
                        >
                          {field.label}
                        </button>
                      ))}
                    </div>
                  ))}
                  {/* Impact units from the settings (home page): amount raised ÷ the unit's amount */}
                  {impacts.length > 0 && (
                    <div className={styles.fieldGroup}>
                      <p className={styles.fieldCategory}>Impact (amount raised ÷ amount)</p>
                      {impacts.map((unit) => (
                        <span key={unit.key}>
                          <button
                            className={styles.chip}
                            onClick={() => updateText(`${selected.template} {{impact.${unit.key}}}`.trim())}
                          >
                            {unit.name}
                          </button>
                          <button
                            className={styles.chip}
                            onClick={() => updateText(`${selected.template} {{teamImpact.${unit.key}}}`.trim())}
                          >
                            Team {unit.name.toLowerCase()}
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Custom variables from the settings (home page) */}
                  {customFields.length > 0 && (
                    <div className={styles.fieldGroup}>
                      <p className={styles.fieldCategory}>Custom</p>
                      {customFields.map((field) => (
                        <button
                          key={field.key}
                          className={styles.chip}
                          onClick={() => updateText(`${selected.template} {{custom.${field.key}}}`.trim())}
                        >
                          {field.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            {/* Style part of the text: select words in the text box above, then pick here */}
            {"style" in selected && (
              <div className={styles.field}>
                Style selected words
                <p className={styles.help}>
                  Select words in the text box above, then choose a colour, size, font or weight.
                </p>
                <div className={styles.selectionTools}>
                  <input
                    type="color"
                    aria-label="Colour for selected words"
                    defaultValue={selected.style.color}
                    onChange={(event) => styleSelection({ color: event.target.value })}
                  />
                  <select
                    className={styles.input}
                    aria-label="Size for selected words"
                    value=""
                    onChange={(event) => styleSelection({ fontSize: Number(event.target.value) })}
                  >
                    <option value="" disabled>
                      Size
                    </option>
                    {WORD_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} px
                      </option>
                    ))}
                  </select>
                  <select
                    className={styles.input}
                    aria-label="Font for selected words"
                    value=""
                    onChange={(event) => styleSelection({ fontFamily: event.target.value })}
                  >
                    <option value="" disabled>
                      Font
                    </option>
                    {FONTS.map((font) => (
                      <option key={font.family} value={font.family} style={{ fontFamily: font.family }}>
                        {font.family}
                      </option>
                    ))}
                  </select>
                  <select
                    className={styles.input}
                    aria-label="Weight for selected words"
                    value=""
                    onChange={(event) => styleSelection({ fontWeight: Number(event.target.value) })}
                  >
                    <option value="" disabled>
                      Weight
                    </option>
                    {Object.entries(WEIGHT_NAMES).map(([weight, label]) => (
                      <option key={weight} value={weight}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    className={styles.input}
                    aria-label="Letter case for selected words"
                    value=""
                    onChange={(event) => styleSelection({ textTransform: event.target.value as LetterCase })}
                  >
                    <option value="" disabled>
                      Letter case
                    </option>
                    {LETTER_CASES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                {!!selected.ranges?.length && (
                  <button className={styles.textButton} onClick={() => updateSelected({ ranges: [] })}>
                    Remove word styles ({selected.ranges.length})
                  </button>
                )}
              </div>
            )}
            {selected.type === "dynamic-image" && (
              <>
                <label className={styles.field}>
                  Photo comes from
                  <select
                    className={styles.input}
                    value={selected.field.startsWith("custom.") ? "custom" : selected.field}
                    onChange={(event) =>
                      updateSelected({ field: event.target.value === "custom" ? "custom." : event.target.value })
                    }
                  >
                    {IMAGE_FIELDS.map((field) => (
                      <option key={field.path} value={field.path}>
                        {field.label}
                      </option>
                    ))}
                    <option value="custom">Custom variable…</option>
                  </select>
                </label>
                {/* A custom variable holds the photo's web address; type its Funraisin field name */}
                {selected.field.startsWith("custom.") && (
                  <label className={styles.field}>
                    Custom variable name
                    <input
                      className={styles.input}
                      placeholder="e.g. team_photo"
                      value={selected.field.slice("custom.".length)}
                      onChange={(event) =>
                        updateSelected({ field: `custom.${event.target.value.replace(/[^A-Za-z0-9_]/g, "")}` })
                      }
                    />
                  </label>
                )}
              </>
            )}
            {selected.type === "image" && (
              <button className="btn btn-small btn-outline" onClick={() => openImages("replace")}>
                Change image
              </button>
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
              onClick={deleteSelected}
              title="You can also press the Delete key"
            >
              Delete layer
            </button>
          </div>
        )}
        <div className={styles.embed}>
          <div className={styles.embedHeader}>
            <p className={styles.embedTitle}>Embed code</p>
            <select
              className={styles.embedSelect}
              value={platform}
              onChange={(event) => setPlatform(event.target.value as EmbedPlatform)}
            >
              {EMBED_PLATFORMS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <pre className={styles.code}>{embed}</pre>
          <button
            className={styles.copy}
            onClick={async () => {
              await navigator.clipboard.writeText(embed);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy code"}
          </button>        </div>

        {/* Download count for this resource, split by the page it was downloaded from */}
        <div className={styles.downloads}>
          <p className="eyebrow">Downloads</p>
          <p className={styles.downloadTotal}>{downloads.total}</p>
          {downloads.total === 0 && <p className="muted">No downloads yet.</p>}
          <ul className={styles.downloadList}>
            {downloads.pages.map((page) => (
              <li key={page.url} className={styles.downloadRow}>
                <a href={page.url} target="_blank" rel="noreferrer" title={page.url} className={styles.downloadUrl}>
                  {page.url.replace(/^https?:\/\//, "")}
                </a>
                <span>{page.count}</span>
              </li>
            ))}
          </ul>
          {downloads.total > 0 && (
            <button className="btn btn-small btn-outline" onClick={() => downloadDialog.current?.showModal()}>
              View all downloads
            </button>
          )}
        </div>

        {/* The full list: one row per download. Opens over the page; Esc or Close shuts it. */}
        <dialog ref={downloadDialog} className={styles.dialog}>
          <div className={styles.dialogHeader}>
            <p className={`display ${styles.dialogTitle}`}>
              Downloads of {name} <span className="muted">({downloads.total})</span>
            </p>
            <button className="btn btn-small btn-outline" onClick={() => downloadDialog.current?.close()}>
              Close
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member ID</th>
                  <th>Name</th>
                  <th>Format</th>
                  <th>Downloaded from</th>
                </tr>
              </thead>
              <tbody>
                {downloads.downloads.map((row, index) => (
                  <tr key={index}>
                    <td>{new Date(row.at).toLocaleString()}</td>
                    <td>{row.memberId ?? "—"}</td>
                    <td>{row.memberName ?? "—"}</td>
                    <td>{row.format.toUpperCase()}</td>
                    <td>
                      <a href={row.url} target="_blank" rel="noreferrer">
                        {row.url}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </dialog>

        {/* The image library: every image of this client. Click one to use it, upload a new one, or delete one. */}
        <dialog ref={imageDialog} className={styles.dialog}>
          <div className={styles.dialogHeader}>
            <p className={`display ${styles.dialogTitle}`}>
              Images <span className="muted">({assetList.length})</span>
            </p>
            <div className={styles.dialogActions}>
              <button className="btn btn-small btn-dark" onClick={() => imageInput.current?.click()}>
                Upload image
              </button>
              <button className="btn btn-small btn-outline" onClick={() => imageDialog.current?.close()}>
                Close
              </button>
            </div>
          </div>
          <p className="muted">Click an image to use it. An uploaded image is used straight away.</p>
          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            hidden
            onChange={async (event) => {
              const file = pickedFile(event);
              if (!file) return;
              try {
                pickImage(await uploadAsset(file));
              } catch (error) {
                window.alert(error instanceof Error ? error.message : "Could not upload the image");
              }
            }}
          />
          {assetList.length === 0 && <p className={styles.emptyImages}>No images yet. Upload the first one.</p>}
          <div className={styles.tableWrap}>
            <div className={styles.assetGrid}>
              {assetList.map((asset) => (
                <div key={asset.id} className={styles.assetTile}>
                  <button
                    title={asset.name}
                    className={`${styles.asset} ${currentImage === asset.url ? styles.assetActive : ""}`}
                    onClick={() => pickImage(asset)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt={asset.name} />
                  </button>
                  <p className={styles.assetName}>{asset.name}</p>
                  {/* Top-right corner: delete this image (refused while a resource still uses it) */}
                  <button
                    className={styles.assetDelete}
                    title={`Delete ${asset.name}`}
                    aria-label={`Delete ${asset.name}`}
                    onClick={() => void removeAsset(asset)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </dialog>
      </aside>
    </div>
  );
}
