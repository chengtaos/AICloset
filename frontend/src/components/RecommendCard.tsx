import type { RecommendResponse, ClothingItem } from "../types";

interface Props {
  loading: boolean;
  data: RecommendResponse | null;
  itemMap: Map<number, ClothingItem>;
}

const WEATHER_ICON: Record<string, string> = {
  "晴": "☀️", "多云": "⛅", "阴": "☁️",
  "雨": "🌧", "雷阵雨": "⛈", "雪": "❄", "小雪": "🌨",
};

export default function RecommendCard({ loading, data, itemMap }: Props) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#8c8c8c" }}>
        <div style={{ fontSize: 15, marginBottom: 8 }}>AI 正在分析天气与衣橱…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#bfbfbf" }}>
        <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>👔</span>
        <span>点击上方按钮获取穿搭推荐</span>
      </div>
    );
  }

  const { weather, suggestions } = data;
  const icon = WEATHER_ICON[weather.condition] || "🌤";

  return (
    <div>
      {/* 天气条 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "16px 20px", border: "1px solid #e8eaed", borderRadius: 4,
        background: "#fff", marginBottom: 24,
      }}>
        <span style={{ fontSize: 36 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 28, fontWeight: 600, color: "#1a1a1a", lineHeight: 1 }}>
            {weather.temperature}°<span style={{ fontSize: 14, color: "#8c8c8c", fontWeight: 400 }}>C</span>
          </div>
          <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>
            体感 {weather.feels_like}°C · {weather.city} · {weather.condition} · 湿度{weather.humidity}% · 风{weather.wind_level}级
          </div>
        </div>
      </div>

      {/* 搭配卡片 */}
      {suggestions.map((sug, idx) => (
        <div key={idx} style={{
          border: "1px solid #e8eaed", borderRadius: 4, background: "#fff",
          padding: 20, marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#8c8c8c", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            推荐 {idx + 1}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12, marginBottom: 18 }}>
            {sug.items.map((item) => (
              <div key={item.id} style={{ textAlign: "center" }}>
                <div style={{
                  width: "100%", aspectRatio: "3/4", background: "#f5f5f5",
                  borderRadius: 4, display: "flex", alignItems: "center",
                  justifyContent: "center", overflow: "hidden", marginBottom: 6,
                }}>
                  {item.images.length > 0 ? (
                    <img
                      src={`http://localhost:8000/${item.images[0]}`}
                      alt={item.sub_category}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: 28, opacity: 0.12 }}>👤</span>
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>{item.sub_category}</div>
                <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                  {item.colors.slice(0, 2).join(" · ")}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 13, color: "#4a5c6c", lineHeight: 1.7, borderTop: "1px solid #f0f0f0", paddingTop: 14 }}>
            {sug.reason}
          </div>
        </div>
      ))}
    </div>
  );
}
