import { Button } from "antd";
import { CheckOutlined, LikeOutlined, DislikeOutlined, DownloadOutlined } from "@ant-design/icons";
import type { RecommendResponse } from "../types";
import { useResponsive } from "../hooks/useResponsive";
import { colors, shadows, radii, spacing, fontSize, fontWeight } from "../styles/tokens";
import { exportOutfitCard } from "../utils/exportImage";
import Card from "./ui/Card";
import { Body, Aux } from "./ui/Typography";
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
      <div style={{ textAlign: "center", padding: "80px 0", color: colors.textSecondary }}>
        <div style={{ fontSize: fontSize.subtitle, marginBottom: spacing.xs }}>AI 正在分析天气与衣橱…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: colors.textTertiary }}>
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
      <Card padding={isMobile ? spacing.sm : spacing.lg} style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 16 }}>
          <span style={{ fontSize: isMobile ? 28 : 36 }}>{icon}</span>
          <div>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: fontWeight.semibold, color: colors.textPrimary, lineHeight: 1 }}>
              {weather.temperature}°<span style={{ fontSize: isMobile ? 12 : 14, color: colors.textSecondary, fontWeight: fontWeight.regular }}>C</span>
            </div>
            <Aux style={{ marginTop: 2 }}>
              体感 {weather.feels_like}°C · {weather.city} · {weather.condition} · 湿度{weather.humidity}% · 风{weather.wind_level}级
            </Aux>
          </div>
        </div>
      </Card>

      {/* 搭配卡片 */}
      {suggestions.map((sug, idx) => (
        <div key={idx} style={{ padding: "20px 0", marginBottom: 16 }}>
          <div style={{ fontSize: fontSize.caption, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            推荐 {idx + 1}
          </div>

          <OutfitComposer items={sug.items} />

          <Body style={{ borderTop: `1px solid ${colors.divider}`, paddingTop: 14, marginTop: 20, marginBottom: 14, color: colors.textPrimary }}>
            {sug.reason}
          </Body>

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
            <span style={{ fontSize: fontSize.body, color: colors.accent, fontWeight: fontWeight.medium }}>
              <CheckOutlined style={{ marginRight: 4 }} />今天这么穿
            </span>
          )}
          {feedbackIdx === idx && (
            <span style={{ fontSize: fontSize.body, color: colors.textSecondary, fontWeight: fontWeight.medium }}>
              感谢反馈
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
