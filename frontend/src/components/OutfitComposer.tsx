import { useState, useRef, useCallback } from "react";
import type { ClothingItemBrief } from "../types";
import { getImageUrl } from "../utils/imageUrl";
import { useResponsive } from "../hooks/useResponsive";
import { colors, radii } from "../styles/tokens";

interface ItemState {
  x: number;
  y: number;
  scale: number;
}

interface Props {
  items: ClothingItemBrief[];
}

// Base sizes as fraction of container width — much larger than before
const BASE_W_FRAC = 0.32; // 32% of container width
const BASE_H_FRAC = 0.40; // 40% of container width

/** Compact default positions for shorter aspect ratio */
const DEFAULT_STATE: Record<string, ItemState> = {
  outer:     { x: 50, y: 16, scale: 1.0 },
  blouse:    { x: 50, y: 32, scale: 1.0 },
  tshirt:    { x: 50, y: 32, scale: 1.0 },
  hoodie:    { x: 50, y: 30, scale: 1.0 },
  sweater:   { x: 50, y: 31, scale: 1.0 },
  dress:     { x: 50, y: 40, scale: 1.1 },
  pants:     { x: 50, y: 58, scale: 1.0 },
  shorts:    { x: 50, y: 60, scale: 0.85 },
  skirt:     { x: 50, y: 58, scale: 1.0 },
  shoes:     { x: 50, y: 82, scale: 0.85 },
  accessory: { x: 18, y: 32, scale: 0.65 },
  bag:       { x: 82, y: 42, scale: 0.7 },
};

type DragMode = "move" | "resize";

export default function OutfitComposer({ items }: Props) {
  const { isMobile, isTablet } = useResponsive();
  const containerRef = useRef<HTMLDivElement>(null);
  const [itemStates, setItemStates] = useState<Record<number, ItemState>>({});
  const [dragging, setDragging] = useState<{ id: number; mode: DragMode } | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; scale: number; cx: number; cy: number }>({
    sx: 0, sy: 0, scale: 1, cx: 0, cy: 0,
  });

  // 始终用断点估算值，避免 ref 在不同渲染阶段的 null/真实值切换导致图片突变
  const containerW = isMobile ? 340 : isTablet ? 380 : 400;
  const BASE_W = Math.round(containerW * BASE_W_FRAC);
  const BASE_H = Math.round(containerW * BASE_H_FRAC);

  const getState = (item: ClothingItemBrief): ItemState =>
    itemStates[item.id] || DEFAULT_STATE[item.category] || { x: 50, y: 50, scale: 1.0 };

  const handleMoveStart = useCallback((e: React.PointerEvent, itemId: number) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const found = items.find((it) => it.id === itemId);
    if (!found) return;
    const st = getState(found);
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      sx: e.clientX - (rect.left + (st.x / 100) * rect.width),
      sy: e.clientY - (rect.top + (st.y / 100) * rect.height),
      scale: st.scale, cx: 0, cy: 0,
    };
    setDragging({ id: itemId, mode: "move" });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [items, itemStates]);

  const handleResizeStart = useCallback((e: React.PointerEvent, itemId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    const found = items.find((it) => it.id === itemId);
    if (!found) return;
    const st = getState(found);
    const rect = el.getBoundingClientRect();
    const cx = rect.left + (st.x / 100) * rect.width;
    const cy = rect.top + (st.y / 100) * rect.height;
    dragRef.current = { sx: 0, sy: 0, scale: st.scale, cx: cx / rect.width * 100, cy: cy / rect.height * 100 };
    setDragging({ id: itemId, mode: "resize" });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [items, itemStates]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (dragging.mode === "move") {
      const x = ((e.clientX - rect.left - dragRef.current.sx) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragRef.current.sy) / rect.height) * 100;
      setItemStates((prev) => ({
        ...prev,
        [dragging.id]: {
          ...getState(items.find((it) => it.id === dragging.id) || { id: dragging.id } as ClothingItemBrief),
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y)),
        },
      }));
    } else {
      const cxPx = (dragRef.current.cx / 100) * rect.width;
      const cyPx = (dragRef.current.cy / 100) * rect.height;
      const dist = Math.sqrt((e.clientX - cxPx) ** 2 + (e.clientY - cyPx) ** 2);
      const refDist = 100;
      const newScale = Math.max(0.3, Math.min(3.0, (dist / refDist) * dragRef.current.scale * 1.5));
      setItemStates((prev) => ({
        ...prev,
        [dragging.id]: {
          ...getState(items.find((it) => it.id === dragging.id) || { id: dragging.id } as ClothingItemBrief),
          scale: Math.round(newScale * 100) / 100,
        },
      }));
    }
  }, [dragging, items, itemStates]);

  const handlePointerUp = useCallback(() => setDragging(null), []);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: isMobile ? "2 / 3" : "3 / 4",
        maxWidth: isMobile ? "100%" : isTablet ? 380 : 400,
        margin: "0 auto",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {items.map((item) => {
        const st = getState(item);
        const isDragging = dragging?.id === item.id;
        const w = BASE_W * st.scale;
        const h = BASE_H * st.scale;

        return (
          <div
            key={item.id}
            onPointerDown={(e) => handleMoveStart(e, item.id)}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              position: "absolute",
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: w,
              height: h,
              transform: "translate(-50%, -50%)",
              cursor: isDragging && dragging?.mode === "move" ? "grabbing" : "grab",
              zIndex: isDragging ? 10 : 1,
              transition: isDragging ? "none" : "left 0.2s ease, top 0.2s ease, width 0.2s ease, height 0.2s ease",
              filter: isDragging
                ? "drop-shadow(0 4px 18px rgba(0,0,0,0.18))"
                : "drop-shadow(0 1px 3px rgba(0,0,0,0.06))",
            }}
          >
            {item.images.length > 0 ? (
              <img
                src={getImageUrl(item.images[0])}
                alt={item.sub_category}
                draggable={false}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "contain",
                  pointerEvents: "none",
                }}
              />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                background: colors.placeholder, borderRadius: radii.sm,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, color: colors.textTertiary,
              }}>
                {item.sub_category}
              </div>
            )}

            <div
              onPointerDown={(e) => handleResizeStart(e, item.id)}
              style={{
                position: "absolute", bottom: -6, right: -6,
                width: 18, height: 18,
                borderRadius: "50%",
                background: colors.surface,
                border: `1px solid ${colors.divider}`,
                cursor: "nesw-resize",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: (isDragging || hoveredId === item.id) ? 1 : 0,
                transition: "opacity 0.15s",
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke={colors.textSecondary} strokeWidth="1.5">
                <path d="M7 1v6H1" />
              </svg>
            </div>
          </div>
        );
      })}

    </div>
  );
}
