import { useState } from "react";
import { DeleteOutlined } from "@ant-design/icons";
import type { ClothingItem } from "../types";
import { getImageUrl } from "../utils/imageUrl";

interface Props {
  item: ClothingItem;
  onClick?: () => void;
  onDelete?: () => void;
}

export default function ItemCard({ item, onClick, onDelete }: Props) {
  const [imgError, setImgError] = useState(false);
  const [hover, setHover] = useState(false);
  const hasImg = !imgError && item.images.length > 0;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: "pointer",
        background: "#fff",
        borderRadius: 8,
        border: "1px solid #eee",
        overflow: "hidden",
        position: "relative",
        boxShadow: hover
          ? "0 8px 24px rgba(0,0,0,0.06)"
          : "0 1px 2px rgba(0,0,0,0.03)",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "box-shadow 0.25s ease, transform 0.25s ease",
      }}
    >
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="删除"
          style={{
            position: "absolute", top: 6, right: 6, zIndex: 1,
            width: 20, height: 20, border: "none", borderRadius: 4,
            background: "rgba(0,0,0,0.3)", color: "#fff",
            fontSize: 11, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hover ? 1 : 0, transition: "opacity 0.15s",
            backdropFilter: "blur(2px)",
          }}
        >
          <DeleteOutlined />
        </button>
      )}

      <div style={{
        width: "100%",
        aspectRatio: "3/4",
        background: hasImg ? "transparent" : "#f6f6f6",
        overflow: "hidden",
      }}>
        {hasImg ? (
          <img
            src={getImageUrl(item.images[0])}
            alt={item.name || item.sub_category}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 6, padding: 8,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d9d9d9" strokeWidth="1">
              <rect x="2" y="6" width="20" height="13" rx="2" />
              <circle cx="8.5" cy="10.5" r="1.5" />
              <path d="M2 15l5-4 4 3 3-5 8 8" />
            </svg>
          </div>
        )}
      </div>

      {/* 名称标签 */}
      <div style={{
        padding: "8px 10px 4px",
        fontSize: 12,
        color: "#1a1a1a",
        fontWeight: 500,
        lineHeight: 1.3,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {item.name || item.sub_category}
      </div>
      {/* 状态标记 */}
      {item.status !== "available" && (
        <div style={{ padding: "0 10px 8px" }}>
          <span style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 2,
            background: item.status === "laundry" ? "#fff7e6" : "#f0f0f0",
            color: item.status === "laundry" ? "#d48806" : "#8c8c8c",
          }}>
            {item.status === "laundry" ? "待洗" : "已归档"}
          </span>
        </div>
      )}
    </div>
  );
}
