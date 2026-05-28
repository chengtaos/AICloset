import { useState } from "react";
import { DeleteOutlined } from "@ant-design/icons";
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

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: "pointer",
        background: colors.surface,
        borderRadius: radii.lg,
        overflow: "hidden",
        position: "relative",
        boxShadow: hover ? shadows.cardHover : shadows.card,
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: transition.default,
      }}
    >
      {/* 删除按钮 */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="删除"
          style={{
            position: "absolute", top: 8, right: 8, zIndex: 1,
            width: 24, height: 24, border: "none", borderRadius: radii.sm,
            background: "rgba(0,0,0,0.15)", color: colors.surface,
            fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hover ? 1 : 0, transition: transition.fast,
            backdropFilter: "blur(4px)",
          }}
        >
          <DeleteOutlined />
        </button>
      )}

      {/* 图片区域 */}
      <ImageBlock
        src={item.images[0]}
        alt={item.name || item.sub_category}
        aspectRatio="3/4"
        radius={0}
      />

      {/* 文字信息 */}
      <div style={{ padding: `${spacing.xs}px ${spacing.sm}px` }}>
        <div
          style={{
            fontSize: fontSize.body,
            color: colors.textPrimary,
            fontWeight: fontWeight.medium,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name || item.sub_category}
        </div>

        {/* 状态标记 */}
        {item.status !== "available" && (
          <div style={{ marginTop: spacing.xxs }}>
            <Tag variant="ghost" size="sm">
              {item.status === "laundry" ? "待洗" : "已归档"}
            </Tag>
          </div>
        )}
      </div>
    </div>
  );
}
