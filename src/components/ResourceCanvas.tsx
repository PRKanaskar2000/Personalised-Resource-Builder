"use client";

import { FILL_STYLE, IMAGE_STYLE, TEXT_BOX_STYLE, boxStyle, segmentStyle, textStyle } from "@/lib/render/layer-styles";
import { resolveLayers } from "@/lib/render/resolve";
import type { DesignDocument, Layer, NormalisedFundraiser } from "@/lib/types";
import styles from "./ResourceCanvas.module.css";

export interface LayerBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  design: DesignDocument;
  fundraiser?: NormalisedFundraiser | null;
  scale?: number;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, box: LayerBox) => void;
  /** Called while the rotate handle is dragged, with the new angle in degrees */
  onRotate?: (id: string, rotation: number) => void;
  /** Called once when a drag or resize finishes (used to save an undo step) */
  onChangeEnd?: () => void;
  interactive?: boolean;
}

// The 8 resize handles: where each sits on the layer (0 = left/top, 1 = right/bottom).
// The name says which edges it moves: "nw" = north + west = top-left corner.
const HANDLES = [
  { edges: "nw", left: 0, top: 0 },
  { edges: "n", left: 0.5, top: 0 },
  { edges: "ne", left: 1, top: 0 },
  { edges: "e", left: 1, top: 0.5 },
  { edges: "se", left: 1, top: 1 },
  { edges: "s", left: 0.5, top: 1 },
  { edges: "sw", left: 0, top: 1 },
  { edges: "w", left: 0, top: 0.5 },
];
const MIN_SIZE = 10;
const HANDLE_SIZE = 12; // pixels on screen, whatever the zoom
const ROTATE_SIZE = 24;
const ROTATE_GAP = 14; // space between the layer and its rotate handle

export function ResourceCanvas({
  design,
  fundraiser,
  scale = 1,
  selectedId,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onChangeEnd,
  interactive = false,
}: Props) {
  const items = resolveLayers(design, fundraiser);
  const selectedLayer = items.find((item) => item.visible && item.layer.id === selectedId)?.layer;
  const canResize = interactive && onResize && selectedLayer && !selectedLayer.locked;

  // Follow the pointer until it is released. dx/dy are in design pixels.
  function track(event: React.PointerEvent, onDrag: (dx: number, dy: number) => void) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const move = (ev: PointerEvent) => onDrag((ev.clientX - startX) / scale, (ev.clientY - startY) / scale);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onChangeEnd?.();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startDrag(event: React.PointerEvent, layer: Layer) {
    if (!interactive || layer.locked || !onMove) return;
    onSelect?.(layer.id);
    track(event, (dx, dy) => onMove(layer.id, Math.round(layer.x + dx), Math.round(layer.y + dy)));
  }

  // The rotate handle sits above the layer, or below it when the layer touches the top of the canvas
  const rotateBelow = !!selectedLayer && selectedLayer.y * scale < ROTATE_SIZE + ROTATE_GAP;

  // Turn the layer to follow the pointer around the layer's centre
  function startRotate(event: React.PointerEvent<HTMLElement>, layer: Layer) {
    event.preventDefault();
    event.stopPropagation();
    const box = event.currentTarget.parentElement!.getBoundingClientRect();
    const centreX = box.left + box.width / 2;
    const centreY = box.top + box.height / 2;
    const move = (ev: PointerEvent) => {
      // Angle of the pointer from the centre; the handle starts straight above (or below) it
      let angle = (Math.atan2(ev.clientY - centreY, ev.clientX - centreX) * 180) / Math.PI + (rotateBelow ? -90 : 90);
      angle = Math.round(angle);
      // Snap to upright, 45° and 90° positions when close, so it is easy to get a layer straight
      const snapped = Math.round(angle / 45) * 45;
      if (Math.abs(angle - snapped) <= 3) angle = snapped;
      onRotate?.(layer.id, ((((angle + 180) % 360) + 360) % 360) - 180); // keep within -180..180
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onChangeEnd?.();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function startResize(event: React.PointerEvent, layer: Layer, edges: string) {
    track(event, (dx, dy) => {
      let left = layer.x;
      let top = layer.y;
      let right = layer.x + layer.width;
      let bottom = layer.y + layer.height;
      if (edges.includes("w")) left = Math.min(left + dx, right - MIN_SIZE);
      if (edges.includes("e")) right = Math.max(right + dx, left + MIN_SIZE);
      if (edges.includes("n")) top = Math.min(top + dy, bottom - MIN_SIZE);
      if (edges.includes("s")) bottom = Math.max(bottom + dy, top + MIN_SIZE);
      onResize?.(layer.id, {
        x: Math.round(left),
        y: Math.round(top),
        width: Math.round(right - left),
        height: Math.round(bottom - top),
      });
    });
  }

  return (
    <div
      className={styles.canvas}
      style={{
        width: design.canvas.width * scale,
        height: design.canvas.height * scale,
        backgroundColor: design.canvas.background,
        backgroundImage: design.canvas.backgroundImage ? `url("${design.canvas.backgroundImage}")` : undefined,
      }}
      onPointerDown={() => onSelect?.(null)}
    >
      <div
        className={styles.inner}
        style={{
          width: design.canvas.width,
          height: design.canvas.height,
          transform: `scale(${scale})`,
        }}
      >
        {items.map(({ layer, visible, text, segments, imageSrc, progress }) => {
          if (!visible) return null;
          const selected = selectedId === layer.id;
          return (
            <div
              key={layer.id}
              data-layer={layer.id}
              onPointerDown={(event) => startDrag(event, layer)}
              className={`${interactive && !layer.locked ? styles.movable : ""} ${selected ? styles.selected : ""}`}
              style={{ ...boxStyle(layer), pointerEvents: interactive ? "auto" : "none" }}
            >
              {/* The layout styles come from layer-styles.ts, which the export uses too */}
              {(layer.type === "text" || layer.type === "dynamic-text") && text && (
                <div style={TEXT_BOX_STYLE}>
                  <div style={textStyle(layer.style)} data-text>
                    {segments?.map((segment, index) => (
                      <span key={index} style={segmentStyle(segment.style)}>
                        {segment.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(layer.type === "image" || layer.type === "dynamic-image") && imageSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageSrc} alt="" style={IMAGE_STYLE} draggable={false} />
              )}
              {/* In the editor, a photo with no picture yet shows a grey placeholder instead of nothing */}
              {(layer.type === "image" || layer.type === "dynamic-image") && !imageSrc && interactive && (
                <div className={styles.placeholder} style={{ fontSize: 14 / scale }}>
                  {layer.type === "image" ? "Choose an image" : "Photo"}
                </div>
              )}
              {layer.type === "progress-bar" && (
                <div style={{ ...FILL_STYLE, background: layer.track }}>
                  <div style={{ ...FILL_STYLE, width: `${(progress ?? 0) * 100}%`, background: layer.fill }} />
                </div>
              )}
            </div>
          );
        })}

        {/* Resize handles around the selected layer: drag any of them to change its size */}
        {canResize && (
          <div
            className={styles.selection}
            style={{
              left: selectedLayer.x,
              top: selectedLayer.y,
              width: selectedLayer.width,
              height: selectedLayer.height,
              transform: `rotate(${selectedLayer.rotation}deg)`,
            }}
          >
            {HANDLES.map((handle) => (
              <div
                key={handle.edges}
                className={styles.handle}
                onPointerDown={(event) => startResize(event, selectedLayer, handle.edges)}
                style={{
                  left: `${handle.left * 100}%`,
                  top: `${handle.top * 100}%`,
                  width: HANDLE_SIZE / scale,
                  height: HANDLE_SIZE / scale,
                  borderWidth: 1.5 / scale,
                  cursor: `${handle.edges}-resize`,
                }}
              />
            ))}
            {/* Rotate handle: drag it around the layer to tilt it */}
            {onRotate && (
              <div
                className={styles.rotateHandle}
                title="Drag to rotate"
                onPointerDown={(event) => startRotate(event, selectedLayer)}
                style={{
                  left: "50%",
                  [rotateBelow ? "bottom" : "top"]: -(ROTATE_SIZE + ROTATE_GAP) / scale,
                  width: ROTATE_SIZE / scale,
                  height: ROTATE_SIZE / scale,
                  fontSize: 15 / scale,
                  borderWidth: 1.5 / scale,
                }}
              >
                ↻
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
