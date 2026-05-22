import type { Outfit, ClothingItem } from "../types";

interface Props {
  outfit: Outfit;
  itemMap: Map<number, ClothingItem>;
  extra?: React.ReactNode;
}

export default function OutfitCard({ outfit, itemMap, extra }: Props) {
  return (
    <div style={{ border: "1px solid #e8eaed", borderRadius: 4, background: "#fff", padding: 20 }}>
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

      {/* 衣物网格 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
        {outfit.items.map((oi, idx) => {
          const item = itemMap.get(oi.item_id);
          return (
            <div key={idx} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "100%",
                  aspectRatio: "3/4",
                  background: "#f5f5f5",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginBottom: 6,
                }}
              >
                {item?.images.length ? (
                  <img
                    src={`http://localhost:8000/${item.images[0]}`}
                    alt={item.sub_category}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 24, opacity: 0.12 }}>👤</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#8c8c8c", fontWeight: 500 }}>{oi.position}</div>
              <div style={{ fontSize: 11, color: "#1a1a1a" }}>{item?.sub_category || "—"}</div>
            </div>
          );
        })}
      </div>

      {/* 标签 */}
      {outfit.tags.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {outfit.tags.map((t) => (
            <span key={t} style={{ fontSize: 11, color: "#8c8c8c", border: "1px solid #e8eaed", borderRadius: 2, padding: "2px 8px" }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
