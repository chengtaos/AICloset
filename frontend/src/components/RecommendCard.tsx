import { Button } from "antd";
import { CheckOutlined, LikeOutlined, DislikeOutlined, DownloadOutlined } from "@ant-design/icons";
import type { RecommendResponse } from "../types";
import { useResponsive } from "../hooks/useResponsive";
import { colors, shadows, radii, spacing, fontSize, fontWeight } from "../styles/tokens";
import { exportOutfitCard } from "../utils/exportImage";
import Card from "./ui/Card";
import { SectionTitle, Body, Aux } from "./ui/Typography";
import EmptyState from "./ui/EmptyState";
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
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Card padding={spacing.lg}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: radii.md, background: colors.divider, animation: "pulse 1.8s ease-in-out infinite" }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 22, width: "40%", borderRadius: 4, background: colors.divider, animation: "pulse 1.8s ease-in-out infinite", animationDelay: "0.15s" }} />
              <div style={{ height: 12, width: "60%", borderRadius: 3, background: colors.divider, marginTop: 8, animation: "pulse 1.8s ease-in-out infinite", animationDelay: "0.3s" }} />
            </div>
          </div>
        </Card>
        <Card padding={spacing.lg}>
          <div style={{ height: 280, borderRadius: radii.md, background: colors.divider, animation: "pulse 1.8s ease-in-out infinite" }} />
        </Card>
      </div>
    );
  }

  if (!data) {
    return <EmptyState icon="👔" title="点击上方按钮获取穿搭推荐" />;
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
          <SectionTitle style={{ marginBottom: 16, marginTop: 0 }}>
            推荐 {idx + 1}
          </SectionTitle>

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
