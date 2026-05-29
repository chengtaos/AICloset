import { useState, useRef, useCallback } from "react";
import type { ClothingItemBrief } from "../types";
import { getImageUrl } from "../utils/imageUrl";
import { colors, radii } from "../styles/tokens";

interface ItemState {
  x: number;   // 百分比 0-100
  y: number;   // 百分比 0-100
  scale: number; // 缩放倍率，默认 1.0
}

interface Props {
  items: ClothingItemBrief[];
}

const BASE_W = 72;
const BASE_H = 90;

/** 各类别的默认锚点位置：上身在上、下身在下、鞋子在底、配饰在侧 */
const DEFAULT_STATE: Record<string, ItemState> = {
  outer:     { x: 50, y: 15, scale: 1.05 },
  blouse:    { x: 50, y: 28, scale: 1.0 },
  tshirt:    { x: 50, y: 28, scale: 1.0 },
  hoodie:    { x: 50, y: 26, scale: 1.05 },
  sweater:   { x: 50, y: 27, scale: 1.0 },
  dress:     { x: 50, y: 38, scale: 1.15 },
  pants:     { x: 50, y: 55, scale: 1.0 },
  shorts:    { x: 50, y: 57, scale: 0.85 },
  skirt:     { x: 50, y: 55, scale: 1.0 },
  shoes:     { x: 50, y: 82, scale: 0.85 },
  accessory: { x: 18, y: 30, scale: 0.7 },
  bag:       { x: 82, y: 42, scale: 0.75 },
};

type DragMode = "move" | "resize";

export default function OutfitComposer({ items }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [itemStates, setItemStates] = useState<Record<number, ItemState>>({});
  const [dragging, setDragging] = useState<{ id: number; mode: DragMode } | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; scale: number; cx: number; cy: number }>({
    sx: 0, sy: 0, scale: 1, cx: 0, cy: 0,
  });

  const getState = (item: ClothingItemBrief): ItemState =>
    itemStates[item.id] || DEFAULT_STATE[item.category] || { x: 50, y: 50, scale: 1.0 };

  const handleMoveStart = useCallback((e: React.PointerEvent, itemId: number) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const st = getState(items.find((it) => it.id === itemId)!);
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
    const st = getState(items.find((it) => it.id === itemId)!);
    const rect = el.getBoundingClientRect();
    const cx = rect.left + (st.x / 100) * rect.width;
    const cy = rect.top + (st.y / 100) * rect.height;
    const initDist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
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
          ...getState(items.find((it) => it.id === dragging.id)!),
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y)),
        },
      }));
    } else {
      // resize: 根据指针到画布中心的距离计算缩放
      const cxPx = (dragRef.current.cx / 100) * rect.width;
      const cyPx = (dragRef.current.cy / 100) * rect.height;
      const dist = Math.sqrt((e.clientX - cxPx) ** 2 + (e.clientY - cyPx) ** 2);
      const refDist = 100; // 基准距离对应的 scale=1
      const newScale = Math.max(0.3, Math.min(3.0, (dist / refDist) * dragRef.current.scale * 1.5));
      setItemStates((prev) => ({
        ...prev,
        [dragging.id]: {
          ...getState(items.find((it) => it.id === dragging.id)!),
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
        aspectRatio: "1 / 2.1",
        maxWidth: 320,
        margin: "0 auto",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* 衣物图层 */}
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
            {/* 图片 */}
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

            {/* 类别标签 */}
            <div style={{
              textAlign: "center", marginTop: 2,
              fontSize: 10, color: colors.textSecondary,
              lineHeight: 1.2, pointerEvents: "none",
            }}>
              {item.sub_category}
            </div>

            {/* 缩放把手：右下角小三角 */}
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

      {/* 底部提示 */}
      {!dragging && items.length > 0 && (
        <div style={{
          position: "absolute", bottom: 8, left: "50%",
          transform: "translateX(-50%)",
          fontSize: 10, color: colors.textTertiary,
          pointerEvents: "none",
          background: "rgba(255,255,255,0.7)",
          padding: "2px 8px", borderRadius: 4,
        }}>
          拖动移动 · 拖拽圆点缩放
        </div>
      )}
    </div>
  );
}
