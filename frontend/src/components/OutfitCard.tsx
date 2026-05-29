import type { ClothingItem, ClothingItemBrief } from "../types";
import { useResponsive } from "../hooks/useResponsive";
import { colors, radii, shadows, spacing, fontWeight, transition } from "../styles/tokens";
import Tag from "./ui/Tag";
import OutfitComposer from "./OutfitComposer";

interface Props {
  outfit: {
    id: number;
    name: string;
    items: { item_id: number; position: string }[];
    tags: string[];
    is_ai_generated: boolean;
    created_at: string;
  };
  itemMap: Map<number, ClothingItem>;
  extra?: React.ReactNode;
}

export default function OutfitCard({ outfit, itemMap, extra }: Props) {
  const { isMobile, isTablet } = useResponsive();

  const briefs: ClothingItemBrief[] = outfit.items
    .map((oi) => itemMap.get(oi.item_id))
    .filter(Boolean)
    .map((item) => ({
      id: item!.id,
      name: item!.name || "",
      category: item!.category,
      sub_category: item!.sub_category,
      colors: item!.colors || [],
      images: item!.images || [],
      style_tags: item!.style_tags || [],
    }));

  return (
    <article
      style={{
        background: "rgba(255,255,255,0.94)",
        borderRadius: radii.xl,
        padding: isMobile ? spacing.sm : isTablet ? spacing.md : spacing.lg,
        border: `1px solid ${colors.divider}`,
        boxShadow: shadows.card,
        transition: transition.default,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: colors.accent, fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
            {outfit.is_ai_generated ? "AI 生成穿搭" : "穿搭笔记"}
          </div>
          <h3
            style={{
              margin: 0,
              color: colors.textPrimary,
              fontSize: isMobile ? 18 : 22,
              lineHeight: 1.2,
              fontWeight: 800,
            }}
          >
            {outfit.name || "未命名搭配"}
          </h3>
        </div>
        {extra}
      </div>

      <div
        style={{
          borderRadius: radii.lg,
          overflow: "hidden",
          background: colors.placeholder,
          marginBottom: 14,
        }}
      >
        <OutfitComposer items={briefs} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {outfit.tags.length > 0
            ? outfit.tags.map((t) => <Tag key={t} variant="outline" size="sm">{t}</Tag>)
            : <Tag variant="ghost" size="sm">日常灵感</Tag>}
        </div>
        <span style={{ color: colors.textTertiary, fontSize: 12, flexShrink: 0 }}>
          {briefs.length} 件单品
        </span>
      </div>
    </article>
  );
}
