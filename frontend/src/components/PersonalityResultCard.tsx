import type { PersonalityResult } from "../types";
import { useResponsive } from "../hooks/useResponsive";
import { colors, radii, shadows, spacing, fontSize, fontWeight } from "../styles/tokens";
import Card from "./ui/Card";
import Tag from "./ui/Tag";
import { Caption, Body } from "./ui/Typography";

interface Props {
  result: PersonalityResult;
  compact?: boolean;
}

const DIM_COLORS = ["#4A90D9", "#50B86C", "#E8A838", "#D94B48", "#8B5CF6"];

export default function PersonalityResultCard({ result, compact }: Props) {
  const { isMobile } = useResponsive();

  return (
    <Card variant="elevated" padding={isMobile ? 20 : 28}>
      {/* 人格类型 */}
      <div style={{ textAlign: "center", marginBottom: compact ? 16 : 24 }}>
        <div
          style={{
            fontSize: compact ? 36 : 48,
            fontWeight: 800,
            color: colors.accent,
            letterSpacing: "0.04em",
            lineHeight: 1,
          }}
        >
          {result.full_code}
        </div>
        <div style={{ fontSize: compact ? 16 : 20, fontWeight: 700, color: colors.textPrimary, marginTop: 6 }}>
          {result.nice_name}
        </div>
        <Caption style={{ marginTop: 6, lineHeight: 1.6 }}>{result.snippet}</Caption>
      </div>

      {/* 维度条 */}
      {result.traits.length > 0 && !compact && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {result.traits.map((t, i) => {
            const pct = Math.round((t.score / 100) * 100);
            return (
              <div key={t.key || i}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                    fontSize: 12,
                    color: colors.textSecondary,
                  }}
                >
                  <span>{t.label}: {t.trait}</span>
                  <span style={{ fontWeight: fontWeight.semibold }}>{pct}%</span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: colors.placeholder,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: 4,
                      background: DIM_COLORS[i % DIM_COLORS.length],
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 穿搭风格建议 */}
      <div
        style={{
          background: colors.accentSoft,
          borderRadius: radii.lg,
          padding: spacing.lg,
        }}
      >
        <Caption style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          穿搭风格
        </Caption>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {result.style_guidance.style_keywords.map((kw) => (
            <Tag key={kw} variant="filled" size="sm">{kw}</Tag>
          ))}
        </div>
        <Body style={{ lineHeight: 1.8 }}>{result.style_guidance.style_advice}</Body>
        <Caption style={{ marginTop: 8 }}>
          建议色系：{result.style_guidance.color_hint}
        </Caption>
      </div>

      {result.completed_at && (
        <Caption style={{ textAlign: "center", marginTop: compact ? 12 : 16 }}>
          测试完成于 {new Date(result.completed_at).toLocaleDateString("zh-CN")}
        </Caption>
      )}
    </Card>
  );
}
