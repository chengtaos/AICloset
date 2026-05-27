import type { Outfit, ClothingItem, ClothingItemBrief } from "../types";
import { getImageUrl } from "../utils/imageUrl";
import { useResponsive } from "../hooks/useResponsive";
import OutfitComposer from "./OutfitComposer";

interface Props {
  outfit: Outfit;
  itemMap: Map<number, ClothingItem>;
  extra?: React.ReactNode;
}

export default function OutfitCard({ outfit, itemMap, extra }: Props) {
  const { isMobile } = useResponsive();

  // 将搭配中的衣物转为 ClothingItemBrief 供 OutfitComposer 使用
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
    <div style={{ border: "1px solid #e8eaed", borderRadius: 4, background: "#fff", padding: isMobile ? 14 : 20 }}>
      {/* 标题行 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
            {outfit.name || "未命名搭配"}
          </span>
          {outfit.is_ai_generated && (
            <span style={{ fontSize: 10, color: "#4a5c6c", border: "1px solid #4a5c6c", borderRadius: 2, padding: "1px 6px" }}>
              AI
            </span>
          )}
        </div>
        {extra}
      </div>

      {/* 穿搭预览 */}
      <div style={{ marginBottom: 16 }}>
        <OutfitComposer items={briefs} />
      </div>

      {/* 标签 */}
      {outfit.tags.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {outfit.tags.map((t) => (
            <span key={t} style={{ fontSize: 11, color: "#4a5c6c", border: "1px solid #4a5c6c", borderRadius: 2, padding: "2px 8px" }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
