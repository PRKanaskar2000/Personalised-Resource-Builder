"use client";

import { useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { ResourceCanvas } from "@/components/ResourceCanvas";
import { EMBED_PLATFORMS, sliderEmbedCode, type EmbedPlatform } from "@/lib/embed-code";
import { DEFAULT_SLIDER_STYLE, sliderVariables, type SliderNav, type SliderStyle } from "@/lib/slider-style";
import type { DesignDocument, NormalisedFundraiser } from "@/lib/types";
import styles from "./SliderBuilder.module.css";

interface Props {
  /** The event, for uploading an arrow icon into its client's images */
  eventId: string;
  resources: { id: string; name: string; design: DesignDocument }[];
  /** The client's image library, to pick an arrow icon from */
  images: { id: string; name: string; url: string }[];
  /** The dummy values the thumbnails show */
  sample: NormalisedFundraiser | null;
}

const THUMB_WIDTH = 150;

const NAV_OPTIONS: { value: SliderNav; label: string }[] = [
  { value: "both", label: "Arrows and dots" },
  { value: "arrows", label: "Arrows only" },
  { value: "dots", label: "Dots only" },
];

// "Slider embed code" on the event page: choose 1 to 4 posts side by side, tick the posts in the order
// they should appear, and copy one embed code for all of them.
// Each post's conditional logic still applies: a member only sees the posts that fit them.
export function SliderBuilder({ eventId, resources, images, sample }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [columns, setColumns] = useState(2);
  const [chosen, setChosen] = useState<string[]>([]);
  const [platform, setPlatform] = useState<EmbedPlatform>("funraisin");
  const [nav, setNav] = useState<SliderNav>("both");
  const [look, setLook] = useState<SliderStyle>(DEFAULT_SLIDER_STYLE);
  const changeLook = (patch: Partial<SliderStyle>) => setLook((current) => ({ ...current, ...patch }));
  const [library, setLibrary] = useState(images);
  const iconInput = useRef<HTMLInputElement>(null);

  // Upload an icon into the client's images and use it in the arrows
  async function uploadIcon(file: File) {
    const body = new FormData();
    body.append("file", file);
    body.append("eventId", eventId);
    const response = await fetch("/api/assets", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return window.alert(result.error ?? "Could not upload the icon");
    setLibrary((list) => [result, ...list]);
    changeLook({ arrowIcon: result.url });
  }
  // Read after the page loads, so server and browser render the same HTML first
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const picked = chosen.flatMap((id) => resources.filter((resource) => resource.id === id));
  const code = picked.length
    ? sliderEmbedCode(platform, picked, columns, nav, look, origin, sample?.individual.id ?? "")
    : "";

  // Small inputs for the arrow and dot settings
  const colour = (label: string, key: "arrowColor" | "arrowBackground" | "dotColor" | "activeDotColor") => (
    <label className={styles.setting}>
      {label}
      <input type="color" value={look[key]} onChange={(event) => changeLook({ [key]: event.target.value })} />
    </label>
  );
  const size = (label: string, key: "arrowSize" | "arrowIconSize" | "dotSize", min: number, max: number) => (
    <label className={styles.setting}>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={look[key]}
        onChange={(event) => changeLook({ [key]: Math.min(max, Math.max(min, Number(event.target.value))) })}
      />
    </label>
  );

  // What the preview arrows show: the icon (flipped for "previous") or ‹ ›
  const arrowContent = (which: "previous" | "next") =>
    look.arrowIcon ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={look.arrowIcon} alt="" className={which === "previous" ? styles.flipped : undefined} />
    ) : which === "previous" ? (
      "‹"
    ) : (
      "›"
    );

  // Ticking adds a post at the end; unticking takes it out
  const toggle = (id: string) => setChosen((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  // Move a chosen post one place earlier (-1) or later (+1)
  function move(id: string, step: -1 | 1) {
    setChosen((list) => {
      const index = list.indexOf(id);
      const target = index + step;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <>
      <button className="btn btn-large btn-outline" onClick={() => dialog.current?.showModal()}>
        Slider embed code
      </button>
      <dialog ref={dialog} className={styles.dialog}>
        <div className={styles.header}>
          <p className={`display ${styles.title}`}>Slider embed code</p>
          <button className="btn btn-small btn-outline" onClick={() => dialog.current?.close()}>
            Close
          </button>
        </div>

        <p className={styles.step}>1. Posts side by side</p>
        <div className={styles.layouts}>
          {[1, 2, 3, 4].map((count) => (
            <button
              key={count}
              className={`${styles.layout} ${columns === count ? styles.layoutOn : ""}`}
              onClick={() => setColumns(count)}
            >
              <span className={styles.layoutIcon}>
                {Array.from({ length: count }, (_, index) => (
                  <span key={index} />
                ))}
              </span>
              {["Single", "Double", "Triple", "Four"][count - 1]}
            </button>
          ))}
        </div>
        <p className="muted">Phones show one post at a time, tablets at most two.</p>

        <p className={styles.step}>2. Arrows and dots</p>
        <div className={styles.navOptions}>
          {NAV_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`${styles.layout} ${nav === option.value ? styles.layoutOn : ""}`}
              onClick={() => setNav(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className={styles.lookRow}>
          <div className={styles.settings}>
            {nav !== "dots" && (
              <>
                {colour("Arrow colour", "arrowColor")}
                {colour("Arrow background", "arrowBackground")}
                {size("Arrow size (px)", "arrowSize", 20, 80)}
                <label className={styles.setting}>
                  Arrow shape
                  <select
                    value={look.arrowShape}
                    onChange={(event) => changeLook({ arrowShape: event.target.value as SliderStyle["arrowShape"] })}
                  >
                    <option value="round">Round</option>
                    <option value="square">Square</option>
                  </select>
                </label>
                {/* An image inside the arrows instead of ‹ › (an icon pointing right; "previous" shows it flipped) */}
                <div className={styles.iconPicker}>
                  Arrow icon
                  <div className={styles.icons}>
                    <button
                      className={`${styles.icon} ${!look.arrowIcon ? styles.iconOn : ""}`}
                      onClick={() => changeLook({ arrowIcon: "" })}
                      title="No image: use ‹ ›"
                    >
                      &rsaquo;
                    </button>
                    {library.map((image) => (
                      <button
                        key={image.id}
                        className={`${styles.icon} ${look.arrowIcon === image.url ? styles.iconOn : ""}`}
                        onClick={() => changeLook({ arrowIcon: image.url })}
                        title={image.name}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt={image.name} />
                      </button>
                    ))}
                    <button className={styles.icon} onClick={() => iconInput.current?.click()} title="Upload an icon">
                      +
                    </button>
                  </div>
                  <input
                    ref={iconInput}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void uploadIcon(file);
                    }}
                  />
                </div>
                {look.arrowIcon && size("Icon size (px)", "arrowIconSize", 8, 80)}
              </>
            )}
            {nav !== "arrows" && (
              <>
                {colour("Dot colour", "dotColor")}
                {colour("Active dot colour", "activeDotColor")}
                {size("Dot size (px)", "dotSize", 4, 30)}
              </>
            )}
            <button className={styles.reset} onClick={() => setLook(DEFAULT_SLIDER_STYLE)}>
              Back to the default look
            </button>
          </div>
          {/* How the controls will look: arrows outside the posts, dots underneath */}
          <div className={styles.navPreview} style={sliderVariables(look) as React.CSSProperties}>
            <div className={styles.navPreviewRow}>
              {nav !== "dots" && <span className={styles.arrow}>{arrowContent("previous")}</span>}
              <span className={styles.fakePost} />
              <span className={styles.fakePost} />
              {nav !== "dots" && <span className={styles.arrow}>{arrowContent("next")}</span>}
            </div>
            {nav !== "arrows" && (
              <div className={styles.dots}>
                <span className={styles.dotActive} />
                <span />
                <span />
              </div>
            )}
          </div>
        </div>

        <p className={styles.step}>3. Choose the posts (in the order they should appear)</p>
        <div className={styles.grid}>
          {resources.map((resource) => {
            const position = chosen.indexOf(resource.id);
            return (
              <label key={resource.id} className={`${styles.post} ${position >= 0 ? styles.postOn : ""}`}>
                <input type="checkbox" checked={position >= 0} onChange={() => toggle(resource.id)} />
                {position >= 0 && <span className={styles.number}>{position + 1}</span>}
                <ResourceCanvas design={resource.design} fundraiser={sample} scale={THUMB_WIDTH / resource.design.canvas.width} />
                <span className={styles.postName}>{resource.name}</span>
                {resource.design.show?.enabled && <span className="muted">Has conditional logic</span>}
              </label>
            );
          })}
        </div>

        {picked.length > 1 && (
          <>
            <p className={styles.step}>Order</p>
            <ol className={styles.order}>
              {picked.map((resource, index) => (
                <li key={resource.id}>
                  <span>{resource.name}</span>
                  <button disabled={index === 0} onClick={() => move(resource.id, -1)} aria-label="Move earlier">
                    ↑
                  </button>
                  <button disabled={index === picked.length - 1} onClick={() => move(resource.id, 1)} aria-label="Move later">
                    ↓
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}

        <div className={styles.codeHeader}>
          <p className={styles.step}>4. Copy the code</p>
          <select value={platform} onChange={(event) => setPlatform(event.target.value as EmbedPlatform)} className={styles.select}>
            {EMBED_PLATFORMS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {code ? (
          <>
            <pre className={styles.code}>{code}</pre>
            <CopyButton text={code} className="btn btn-dark" />
          </>
        ) : (
          <p className="muted">Choose at least one post.</p>
        )}
      </dialog>
    </>
  );
}
