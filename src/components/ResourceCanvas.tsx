"use client";

import { resolveLayers } from "@/lib/render/resolve";
import type { DesignDocument, Layer, NormalisedFundraiser } from "@/lib/types";
import styles from "./ResourceCanvas.module.css";

interface Props {
  design: DesignDocument;
  fundraiser?: NormalisedFundraiser | null;
  scale?: number;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  interactive?: boolean;
}

export function ResourceCanvas({
  design,
  fundraiser,
  scale = 1,
  selectedId,
  onSelect,
  onMove,
  interactive = false,
}: Props) {
  const items = resolveLayers(design, fundraiser);

  function startDrag(event: React.PointerEvent<HTMLDivElement>, layer: Layer) {
    if (!interactive || layer.locked || !onMove) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(layer.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const origX = layer.x;
    const origY = layer.y;
    const move = (ev: PointerEvent) => {
      onMove(layer.id, origX + (ev.clientX - startX) / scale, origY + (ev.clientY - startY) / scale);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      className={styles.canvas}
      style={{
        width: design.canvas.width * scale,
        height: design.canvas.height * scale,
        background: design.canvas.background,
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
        {items.map(({ layer, visible, text, imageSrc, progress }) => {
          if (!visible) return null;
          const selected = selectedId === layer.id;
          return (
            <div
              key={layer.id}
              onPointerDown={(event) => startDrag(event, layer)}
              className={`${styles.layer} ${interactive && !layer.locked ? styles.movable : ""} ${selected ? styles.selected : ""}`}
              style={{
                left: layer.x,
                top: layer.y,
                width: layer.width,
                height: layer.height,
                opacity: layer.opacity,
                transform: `rotate(${layer.rotation}deg)`,
                borderRadius:
                  layer.type === "ellipse"
                    ? "50%"
                    : "radius" in layer
                      ? layer.radius
                      : 0,
                overflow: "hidden",
                background:
                  layer.type === "rect" || layer.type === "ellipse"
                    ? layer.fill
                    : "transparent",
                pointerEvents: interactive ? "auto" : "none",
              }}
            >
              {(layer.type === "text" || layer.type === "dynamic-text") && text && (
                <div
                  className={styles.text}
                  style={{
                    fontFamily: layer.style.fontFamily,
                    fontSize: layer.style.fontSize,
                    fontWeight: layer.style.fontWeight,
                    color: layer.style.color,
                    textAlign: layer.style.align,
                    letterSpacing: layer.style.letterSpacing,
                    lineHeight: layer.style.lineHeight,
                    justifyContent:
                      layer.style.align === "left"
                        ? "flex-start"
                        : layer.style.align === "right"
                          ? "flex-end"
                          : "center",
                  }}
                >
                  {text}
                </div>
              )}
              {(layer.type === "image" || layer.type === "dynamic-image") && imageSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageSrc} alt="" className={styles.image} />
              )}
              {layer.type === "progress-bar" && (
                <div className={styles.full} style={{ background: layer.track }}>
                  <div className={styles.full} style={{ width: `${(progress ?? 0) * 100}%`, background: layer.fill }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
