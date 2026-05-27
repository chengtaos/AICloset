import { Button } from "antd";
import { CheckOutlined, LikeOutlined, DislikeOutlined, DownloadOutlined } from "@ant-design/icons";
import type { RecommendResponse } from "../types";
import { useResponsive } from "../hooks/useResponsive";
import { exportOutfitCard } from "../utils/exportImage";
import OutfitComposer from "./OutfitComposer";

interface Props {
  loading: boolean;
  data: RecommendResponse | null;
  onAccept?: (itemIds: number[], idx: number) => void;
  onFeedback?: (idx: number, feedback: "liked" | "disliked") => void;
  accepting?: boolean;
  acceptedIdx?: number | null;
  feedbackIdx?: number | null;
}

const WEATHER_ICON: Record<string, string> = {
  "晴": "☀️", "多云": "⛅", "阴": "☁️",
  "雨": "🌧", "雷阵雨": "⛈", "雪": "❄", "小雪": "🌨",
};

export default function RecommendCard({ loading, data, onAccept, onFeedback, accepting, acceptedIdx, feedbackIdx }: Props) {
  const { isMobile } = useResponsive();

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
        display: "flex", alignItems: "center", gap: isMobile ? 12 : 16,
        padding: isMobile ? "12px 14px" : "16px 20px",
        border: "1px solid #e8eaed", borderRadius: 4,
        background: "#fff", marginBottom: 24,
      }}>
        <span style={{ fontSize: isMobile ? 28 : 36 }}>{icon}</span>
        <div>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 600, color: "#1a1a1a", lineHeight: 1 }}>
            {weather.temperature}°<span style={{ fontSize: isMobile ? 12 : 14, color: "#8c8c8c", fontWeight: 400 }}>C</span>
          </div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: "#8c8c8c", marginTop: 2 }}>
            体感 {weather.feels_like}°C · {weather.city} · {weather.condition} · 湿度{weather.humidity}% · 风{weather.wind_level}级
          </div>
        </div>
      </div>

      {/* 搭配卡片 */}
      {suggestions.map((sug, idx) => (
        <div key={idx} style={{
          padding: "20px 0", marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#8c8c8c", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            推荐 {idx + 1}
          </div>

          {/* 矢量组合图：衣物图片叠加在身体轮廓上，支持拖动 */}
          <OutfitComposer items={sug.items} />

          <div style={{ fontSize: 13, color: "#4a5c6c", lineHeight: 1.7, borderTop: "1px solid #f0f0f0", paddingTop: 14, marginTop: 20, marginBottom: 14 }}>
            {sug.reason}
          </div>

          {onAccept && acceptedIdx == null && feedbackIdx == null && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Button
                icon={<CheckOutlined />}
                size="middle"
                loading={accepting}
                onClick={() => onAccept(sug.items.map((it) => it.id), idx)}
                style={{ fontSize: 12, fontWeight: 500 }}
              >
                就它了
              </Button>
              {onFeedback && (
                <>
                  <Button
                    size="middle" icon={<LikeOutlined />}
                    onClick={() => onFeedback(idx, "liked")}
                    style={{ fontSize: 12 }}
                  />
                  <Button
                    size="middle" icon={<DislikeOutlined />}
                    onClick={() => onFeedback(idx, "disliked")}
                    style={{ fontSize: 12 }}
                  />
                </>
              )}
              <Button
                size="middle"
                icon={<DownloadOutlined />}
                onClick={() => exportOutfitCard(sug.items, sug.reason, weather)}
                style={{ fontSize: 12 }}
              >
                导出卡片
              </Button>
            </div>
          )}
          {acceptedIdx === idx && (
            <span style={{ fontSize: 12, color: "#4a5c6c", fontWeight: 500 }}>
              <CheckOutlined style={{ marginRight: 4 }} />今天这么穿
            </span>
          )}
          {feedbackIdx === idx && (
            <span style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 500 }}>
              感谢反馈
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
