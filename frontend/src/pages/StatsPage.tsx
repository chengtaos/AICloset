import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchStats, fetchWearRecords, fetchItems, fetchGapAnalysis } from "../api/client";
import { getImageUrl } from "../utils/imageUrl";
import { useResponsive } from "../hooks/useResponsive";
import type { ClothingItem } from "../types";
import { CATEGORY_LABELS } from "../types";
import { colors, radii, spacing, fontSize, fontWeight, shadows } from "../styles/tokens";
import Card from "../components/ui/Card";
import { Title, SectionTitle, Caption, Aux } from "../components/ui/Typography";
import Tag from "../components/ui/Tag";
import ImageBlock from "../components/ui/ImageBlock";
import EmptyState from "../components/ui/EmptyState";
import WearCalendar from "../components/WearCalendar";

// 卡片容器样式已由 Card 组件替代，保留此常量用于内嵌 grid 场景

// 列表项缩略图样式（高频穿着 / 沉睡单品复用）
const thumbStyle: React.CSSProperties = {
  width: 40,
  height: 50,
  background: colors.placeholder,
  borderRadius: 4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  flexShrink: 0,
};

export default function StatsPage() {
  const { isMobile } = useResponsive();
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: fetchStats });
  const { data: items = [] } = useQuery({ queryKey: ["items"], queryFn: () => fetchItems() });
  const { data: records = [] } = useQuery({
    queryKey: ["wearRecords", calYear, calMonth],
    queryFn: () => fetchWearRecords(calYear, calMonth),
  });
  const { data: gap } = useQuery({
    queryKey: ["gapAnalysis"],
    queryFn: fetchGapAnalysis,
  });

  const itemMap = useMemo(() => {
    const map = new Map<number, ClothingItem>();
    items.forEach((it) => map.set(it.id, it));
    return map;
  }, [items]);

  if (!stats) return null;

  return (
    <div>
      <Title style={{ marginBottom: spacing.xl }}>统计</Title>

      {/* 概览卡片 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: isMobile ? 8 : 12,
          marginBottom: 24,
        }}
      >
        {[
          { label: "衣物总数", value: `${stats.total_items} 件` },
          { label: "衣橱价值", value: `¥${stats.total_value.toLocaleString()}` },
          { label: "沉睡单品", value: `${stats.sleeping_items.length} 件` },
          (() => {
            const totalWear = items.reduce((s, it) => s + (it.wear_count || 0), 0);
            const totalPrice = items.reduce((s, it) => s + (it.purchase_price || 0), 0);
            const avgCost = totalWear > 0 ? Math.round(totalPrice / totalWear) : 0;
            return { label: "均次穿着成本", value: avgCost > 0 ? `¥${avgCost.toLocaleString()}` : "—" };
          })(),
        ].map(({ label, value }) => (
          <Card key={label} padding={isMobile ? "12px 14px" : "16px 20px"}>
            <Caption style={{ marginBottom: 4 }}>{label}</Caption>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 600, color: colors.textPrimary }}>
              {value}
            </div>
          </Card>
        ))}
      </div>

      {/* 品类分布 + 颜色分布 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {/* 品类分布 */}
        <Card padding={20}>
          <SectionTitle style={{ marginTop: 0, marginBottom: 12 }}>品类分布</SectionTitle>
          {stats.category_distribution.map((c) => {
            const pct =
              stats.total_items > 0
                ? Math.round((c.count / stats.total_items) * 100)
                : 0;
            return (
              <div key={c.category} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 3,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: colors.accent }}>
                    {CATEGORY_LABELS[c.category] || c.category}
                  </span>
                  <span style={{ color: colors.textSecondary }}>
                    {c.count} 件 · {pct}%
                  </span>
                </div>
                <div
                  style={{
                    height: 3,
                    background: colors.divider,
                    borderRadius: 1,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: colors.accent,
                      borderRadius: 1,
                      minWidth: pct > 0 ? 2 : 0,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </Card>

        {/* 颜色分布 */}
        <Card padding={20}>
          <SectionTitle style={{ marginTop: 0, marginBottom: 12 }}>颜色分布</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {stats.color_distribution.map((c) => (
              <Tag key={c.category} variant="outline" size="sm">
                {c.category} · {c.count}
              </Tag>
            ))}
          </div>
        </Card>
      </div>

      {/* 最爱穿 + 沉睡单品 */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        {/* 高频穿着 */}
        <Card padding={20}>
          <SectionTitle style={{ marginTop: 0, marginBottom: 12 }}>高频穿着</SectionTitle>
          {stats.most_worn.length === 0 ? (
            <EmptyState icon="📊" title="还没有穿着记录" />
          ) : (
            stats.most_worn.map((item) => {
              const full = itemMap.get(item.id);
              const wearCount = full?.wear_count || 1;
              const price = full?.purchase_price || 0;
              const costPerWear = wearCount > 0 ? Math.round(price / wearCount) : 0;
              return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: `1px solid ${colors.divider}`,
                }}
              >
                <div style={thumbStyle}>
                  {item.images.length > 0 ? (
                    <img
                      src={getImageUrl(item.images[0])}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 16, opacity: 0.15 }}>👤</span>
                  )}
                </div>
                <div style={{ fontSize: 12, flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{item.name || item.sub_category}</div>
                  <div style={{ color: colors.textSecondary }}>
                    {item.colors.join(" · ")} · 穿{wearCount}次
                    {costPerWear > 0 && ` · ¥${costPerWear}/次`}
                  </div>
                </div>
              </div>
            )})
          )}
        </Card>

        {/* 沉睡单品：超过 30 天未穿着的衣物 */}
        <Card padding={20}>
          <SectionTitle style={{ marginTop: 0, marginBottom: 12 }}>沉睡单品</SectionTitle>
          {stats.sleeping_items.length === 0 ? (
            <EmptyState icon="✨" title="所有衣物都穿过" />
          ) : (
            stats.sleeping_items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: `1px solid ${colors.divider}`,
                }}
              >
                <div style={thumbStyle}>
                  {item.images.length > 0 ? (
                    <img
                      src={getImageUrl(item.images[0])}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 16, opacity: 0.15 }}>👤</span>
                  )}
                </div>
                <div style={{ fontSize: 12, flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{item.sub_category}</div>
                  <div style={{ color: colors.textSecondary }}>
                    {item.colors.join(" · ")}
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* 衣橱缺口分析 */}
      {gap && (
        <Card padding={20} style={{ marginBottom: spacing.xl }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
            <SectionTitle style={{ margin: 0 }}>衣橱缺口分析</SectionTitle>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: gap.coverage_score >= 70 ? colors.success : gap.coverage_score >= 40 ? colors.warning : colors.error,
            }}>
              {gap.owned_basics}/{gap.total_basics} · {gap.coverage_score}%
            </span>
          </div>
          {gap.missing_items.length === 0 ? (
            <div style={{ fontSize: 13, color: colors.success, padding: "12px 0" }}>
              基础款已齐全，衣橱配置很完整
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {gap.missing_items.map((m) => (
                <Tag key={`${m.category}-${m.sub_category}`} variant="outline" size="sm">
                  <Aux>{CATEGORY_LABELS[m.category] || m.category}</Aux> {m.sub_category}
                </Tag>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 穿着日历 */}
      <div style={{ marginTop: 32 }}>
        <SectionTitle style={{ marginBottom: 16 }}>穿着日历</SectionTitle>
        <WearCalendar
          year={calYear}
          month={calMonth}
          records={records}
          itemMap={itemMap}
          onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
        />
      </div>
    </div>
  );
}
