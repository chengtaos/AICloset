import { useState } from "react";
import { DeleteOutlined, HeartOutlined } from "@ant-design/icons";
import type { ClothingItem } from "../types";
import { colors, shadows, radii, spacing, fontSize, fontWeight, transition } from "../styles/tokens";
import ImageBlock from "./ui/ImageBlock";
import Tag from "./ui/Tag";

interface Props {
  item: ClothingItem;
  onClick?: () => void;
  onDelete?: () => void;
}

export default function ItemCard({ item, onClick, onDelete }: Props) {
  const [hover, setHover] = useState(false);
  const coverRatio = item.id % 3 === 0 ? "4/5" : item.id % 3 === 1 ? "3/4" : "1/1.22";

  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: "pointer",
        background: "rgba(255,255,255,0.94)",
        borderRadius: radii.xl,
        overflow: "hidden",
        position: "relative",
        boxShadow: hover ? shadows.cardHover : shadows.card,
        transform: hover ? "translateY(-5px) scale(1.01)" : "translateY(0) scale(1)",
        transition: transition.default,
        border: `1px solid ${colors.divider}`,
      }}
    >
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="删除"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 2,
            width: 30,
            height: 30,
            border: "none",
            borderRadius: radii.full,
            background: "rgba(31,31,31,0.34)",
            color: colors.surface,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: hover ? 1 : 0,
            transition: transition.fast,
            backdropFilter: "blur(10px)",
          }}
        >
          <DeleteOutlined />
        </button>
      )}

      <ImageBlock
        src={item.images[0]}
        alt={item.name || item.sub_category}
        aspectRatio={coverRatio}
        radius={0}
      />

      <div style={{ padding: `${spacing.sm}px ${spacing.md}px ${spacing.md}px` }}>
        <div
          style={{
            fontSize: fontSize.bodyLarge,
            color: colors.textPrimary,
            fontWeight: fontWeight.semibold,
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {item.name || item.sub_category}
        </div>

        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", minWidth: 0 }}>
            {item.colors.slice(0, 2).map((color) => (
              <span
                key={color}
                style={{
                  fontSize: 11,
                  color: colors.textSecondary,
                  background: colors.placeholder,
                  borderRadius: radii.full,
                  padding: "2px 7px",
                }}
              >
                {color}
              </span>
            ))}
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              color: colors.textTertiary,
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            <HeartOutlined /> {item.wear_count || 0}
          </span>
        </div>

        {item.style_tags.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 9 }}>
            {item.style_tags.slice(0, 2).map((tag) => (
              <Tag key={tag} variant="ghost" size="sm">
                {tag}
              </Tag>
            ))}
          </div>
        )}

        {item.status !== "available" && (
          <div style={{ marginTop: spacing.xs }}>
            <Tag variant="filled" size="sm">
              {item.status === "laundry" ? "待洗" : "已归档"}
            </Tag>
          </div>
        )}
      </div>
    </article>
  );
}
