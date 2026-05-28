import type { ClothingItem, ClothingItemBrief } from "../types";
import { useResponsive } from "../hooks/useResponsive";
import { spacing } from "../styles/tokens";
import Card from "./ui/Card";
import Tag from "./ui/Tag";
import { SectionTitle } from "./ui/Typography";
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
  const { isMobile } = useResponsive();

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
    <Card padding={isMobile ? spacing.sm : spacing.lg}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SectionTitle>{outfit.name || "未命名搭配"}</SectionTitle>
          {outfit.is_ai_generated && (
            <Tag variant="outline" size="sm" active>AI</Tag>
          )}
        </div>
        {extra}
      </div>

      <div style={{ marginBottom: 16 }}>
        <OutfitComposer items={briefs} />
      </div>

      {outfit.tags.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {outfit.tags.map((t) => (
            <Tag key={t} variant="outline" size="sm">{t}</Tag>
          ))}
        </div>
      )}
    </Card>
  );
}
