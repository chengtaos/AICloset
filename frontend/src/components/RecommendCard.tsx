import { Button } from "antd";
import { CheckOutlined, DislikeOutlined, DownloadOutlined, LikeOutlined } from "@ant-design/icons";
import type { RecommendResponse } from "../types";
import { useResponsive } from "../hooks/useResponsive";
import { colors, radii, shadows, spacing, fontSize, fontWeight } from "../styles/tokens";
import { exportOutfitCard } from "../utils/exportImage";
import EmptyState from "./ui/EmptyState";
import OutfitComposer from "./OutfitComposer";
import Tag from "./ui/Tag";

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
  晴: "晴",
  多云: "云",
  阴: "阴",
  雨: "雨",
  雪: "雪",
};

export default function RecommendCard({
  loading,
  data,
  onAccept,
  onFeedback,
  accepting,
  acceptedIdx,
  feedbackIdx,
}: Props) {
  const { isMobile, isTablet } = useResponsive();

  if (loading) {
    return (
      <div className="xhs-feed">
        {[0, 1, 2].map((i) => (
          <div className="xhs-feed-item" key={i}>
            <div
              style={{
                height: i === 1 ? 420 : 360,
                borderRadius: radii.xl,
                background: "linear-gradient(90deg, #f6efeb 0%, #fff 45%, #f6efeb 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.7s ease-in-out infinite",
                boxShadow: shadows.card,
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return <EmptyState icon="灵" title="点击上方按钮，生成今天的穿搭灵感" />;
  }

  const { weather, suggestions } = data;
  const icon = WEATHER_ICON[weather.condition] || weather.condition.slice(0, 1) || "天";

  return (
    <div>
      <section
        style={{
          marginBottom: 20,
          borderRadius: radii.xl,
          padding: isMobile ? 16 : 20,
          background: "rgba(255,255,255,0.88)",
          border: `1px solid ${colors.divider}`,
          boxShadow: shadows.card,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div>
          <div style={{ color: colors.accent, fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
            {weather.city} 今日穿搭天气
          </div>
          <div style={{ color: colors.textPrimary, fontSize: isMobile ? 28 : 34, fontWeight: 800, lineHeight: 1 }}>
            {weather.temperature}°C
          </div>
          <div style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>
            体感 {weather.feels_like}°C · 湿度 {weather.humidity}% · 风力 {weather.wind_level} 级
          </div>
        </div>
        <div
          style={{
            width: isMobile ? 62 : 76,
            height: isMobile ? 62 : 76,
            borderRadius: radii.full,
            background: colors.accentSoft,
            color: colors.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          {icon}
        </div>
      </section>

      <div className="xhs-feed">
        {suggestions.map((sug, idx) => (
          <article
            className="xhs-feed-item"
            key={idx}
            style={{
              background: "rgba(255,255,255,0.94)",
              borderRadius: radii.xl,
              border: `1px solid ${colors.divider}`,
              boxShadow: shadows.card,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: isMobile ? 14 : isTablet ? 16 : 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ color: colors.accent, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    AI 穿搭灵感 {idx + 1}
                  </div>
                  <h3 style={{ margin: 0, color: colors.textPrimary, fontSize: 21, lineHeight: 1.2 }}>
                    今天可以这样穿
                  </h3>
                </div>
                <Tag variant="filled" size="sm">{sug.items.length} 件</Tag>
              </div>

              <div style={{ borderRadius: radii.lg, overflow: "hidden", background: colors.placeholder }}>
                <OutfitComposer items={sug.items} />
              </div>

              <p
                style={{
                  margin: "16px 0 0",
                  color: colors.textPrimary,
                  fontSize: fontSize.bodyLarge,
                  lineHeight: 1.8,
                }}
              >
                {sug.reason}
              </p>

              {onAccept && acceptedIdx == null && feedbackIdx == null && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
                  <Button
                    icon={<CheckOutlined />}
                    type="primary"
                    loading={accepting}
                    onClick={() => onAccept(sug.items.map((it) => it.id), idx)}
                    style={{ fontWeight: 700 }}
                  >
                    今天就穿这套
                  </Button>
                  {onFeedback && (
                    <>
                      <Button icon={<LikeOutlined />} onClick={() => onFeedback(idx, "liked")} />
                      <Button icon={<DislikeOutlined />} onClick={() => onFeedback(idx, "disliked")} />
                    </>
                  )}
                  <Button icon={<DownloadOutlined />} onClick={() => exportOutfitCard(sug.items, sug.reason, weather)}>
                    导出
                  </Button>
                </div>
              )}

              {acceptedIdx === idx && (
                <span style={{ display: "block", marginTop: 14, fontSize: fontSize.body, color: colors.accent, fontWeight: fontWeight.semibold }}>
                  <CheckOutlined style={{ marginRight: 4 }} />已记录今天穿着
                </span>
              )}
              {feedbackIdx === idx && (
                <span style={{ display: "block", marginTop: 14, fontSize: fontSize.body, color: colors.textSecondary, fontWeight: fontWeight.medium }}>
                  已收到反馈
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
