import { useState } from "react";
import type { ClothingItem } from "../types";

interface Props {
  item: ClothingItem;
  selected?: boolean;
  onClick?: () => void;
}

export default function ItemCard({ item, selected, onClick }: Props) {
  const [imgError, setImgError] = useState(false);
  const imgSrc = !imgError && item.images.length > 0 ? `http://localhost:8000/${item.images[0]}` : "";

  return (
    <div
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        borderRadius: 4,
        border: `1px solid ${selected ? "#4a5c6c" : "#e8eaed"}`,
        background: "#fff",
        overflow: "hidden",
        transition: "border-color 0.15s",
      }}
    >
      {/* 图片 */}
      <div
        style={{
          width: "100%",
          aspectRatio: "3/4",
          background: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={item.sub_category}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 32, opacity: 0.15 }}>👤</span>
        )}
      </div>

      {/* 信息 */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>
          {item.sub_category}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#8c8c8c" }}>
            {item.colors.slice(0, 2).join(" · ")}
          </span>
          <span style={{ fontSize: 11, color: "#bfbfbf" }}>
            {item.temp_min}–{item.temp_max}°C
          </span>
          {item.wear_count > 0 && (
            <span style={{ fontSize: 11, color: "#bfbfbf" }}>×{item.wear_count}</span>
          )}
        </div>
      </div>
    </div>
  );
}
