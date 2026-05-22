import { useState } from "react";
import type { ClothingItem } from "../types";

interface Props {
  item: ClothingItem;
  onClick?: () => void;
}

export default function ItemCard({ item, onClick }: Props) {
  const [imgError, setImgError] = useState(false);
  const hasImg = !imgError && item.images.length > 0;

  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        background: "#fff",
        transition: "opacity 0.2s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0.7"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
    >
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

      <div style={{ padding: "8px 0" }}>
        <div style={{
          fontSize: 12, fontWeight: 500, color: "#1a1a1a",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.sub_category}
        </div>
        <div style={{
          fontSize: 11, color: "#999", marginTop: 2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.colors.slice(0, 2).join(" · ")}
          {item.wear_count > 0 && `  |  ×${item.wear_count}`}
        </div>
      </div>
    </div>
  );
}
