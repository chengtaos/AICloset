import { useState } from "react";
import { DeleteOutlined } from "@ant-design/icons";
import type { ClothingItem } from "../types";

interface Props {
  item: ClothingItem;
  onClick?: () => void;
  onDelete?: () => void;
}

function formatWornTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff < 7) return `${diff}天前`;
  if (diff < 14) return "1周前";
  if (diff < 21) return "2周前";
  if (diff < 28) return "3周前";
  if (diff < 60) return "1个月前";
  if (diff < 90) return "2个月前";
  if (diff < 180) return "3个月前";
  return "半年前";
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
        position: "relative",
        opacity: hover ? 0.7 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="删除"
          style={{
            position: "absolute", top: 4, right: 4, zIndex: 1,
            width: 22, height: 22, border: "none", borderRadius: 2,
            background: "rgba(0,0,0,0.35)", color: "#fff",
            fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hover ? 1 : 0, transition: "opacity 0.15s",
          }}
        >
          <DeleteOutlined />
        </button>
      )}

      <div style={{
        width: "100%",
        aspectRatio: "3/4",
        background: hasImg ? "transparent" : "#f4f4f4",
        overflow: "hidden",
      }}>
        {hasImg ? (
          <img
            src={`http://localhost:8000/${item.images[0]}`}
            alt={item.sub_category}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d9d9d9" strokeWidth="1">
              <rect x="2" y="6" width="20" height="13" rx="2" />
              <circle cx="8.5" cy="10.5" r="1.5" />
              <path d="M2 15l5-4 4 3 3-5 8 8" />
            </svg>
          </div>
        )}
      </div>

      <div style={{ padding: "6px 0 2px", textAlign: "center" }}>
        <span style={{ fontSize: 10, color: "#bfbfbf" }}>
          {item.last_worn_date ? formatWornTime(item.last_worn_date) : "未穿"}
        </span>
      </div>
    </div>
  );
}
