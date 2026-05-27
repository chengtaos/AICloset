import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchStats, fetchWearRecords, fetchItems } from "../api/client";
import { getImageUrl } from "../utils/imageUrl";
import { useResponsive } from "../hooks/useResponsive";
import type { ClothingItem } from "../types";
import { CATEGORY_LABELS } from "../types";
import WearCalendar from "../components/WearCalendar";

// 复用的卡片容器样式（概览卡、品类分布、颜色分布、最爱穿、沉睡单品共用）
const cardStyle = {
  border: "1px solid #e8eaed",
  borderRadius: 4,
  background: "#fff",
};

// 列表项缩略图样式（高频穿着 / 沉睡单品复用）
const thumbStyle: React.CSSProperties = {
  width: 40,
  height: 50,
  background: "#f5f5f5",
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

  const itemMap = useMemo(() => {
    const map = new Map<number, ClothingItem>();
    items.forEach((it) => map.set(it.id, it));
    return map;
  }, [items]);

  if (!stats) return null;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a", margin: "0 0 24px" }}>
        统计
      </h2>

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
          <div key={label} style={{ ...cardStyle, padding: isMobile ? "12px 14px" : "16px 20px" }}>
            <div style={{ fontSize: isMobile ? 11 : 12, color: "#8c8c8c", marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 600, color: "#1a1a1a" }}>
              {value}
            </div>
          </div>
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
        <div style={{ ...cardStyle, padding: 20 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: "0 0 12px",
            }}
          >
            品类分布
          </h3>
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
                  <span style={{ color: "#4a5c6c" }}>
                    {CATEGORY_LABELS[c.category] || c.category}
                  </span>
                  <span style={{ color: "#8c8c8c" }}>
                    {c.count} 件 · {pct}%
                  </span>
                </div>
                <div
                  style={{
                    height: 3,
                    background: "#f0f0f0",
                    borderRadius: 1,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: "#4a5c6c",
                      borderRadius: 1,
                      minWidth: pct > 0 ? 2 : 0,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 颜色分布 */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: "0 0 12px",
            }}
          >
            颜色分布
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {stats.color_distribution.map((c) => (
              <span
                key={c.category}
                style={{
                  fontSize: 11,
                  color: "#4a5c6c",
                  border: "1px solid #e8eaed",
                  borderRadius: 2,
                  padding: "3px 10px",
                }}
              >
                {c.category} · {c.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 最爱穿 + 沉睡单品 */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        {/* 高频穿着 */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: "0 0 12px",
            }}
          >
            高频穿着
          </h3>
          {stats.most_worn.length === 0 ? (
            <div
              style={{
                fontSize: 13,
                color: "#bfbfbf",
                padding: "20px 0",
                textAlign: "center",
              }}
            >
              还没有穿着记录
            </div>
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
                  borderBottom: "1px solid #f0f0f0",
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
                  <div style={{ color: "#8c8c8c" }}>
                    {item.colors.join(" · ")} · 穿{wearCount}次
                    {costPerWear > 0 && ` · ¥${costPerWear}/次`}
                  </div>
                </div>
              </div>
            )})
          )}
        </div>

        {/* 沉睡单品：超过 30 天未穿着的衣物 */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: "0 0 12px",
            }}
          >
            沉睡单品
          </h3>
          {stats.sleeping_items.length === 0 ? (
            <div
              style={{
                fontSize: 13,
                color: "#bfbfbf",
                padding: "20px 0",
                textAlign: "center",
              }}
            >
              所有衣物都穿过
            </div>
          ) : (
            stats.sleeping_items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: "1px solid #f0f0f0",
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
                  <div style={{ color: "#8c8c8c" }}>
                    {item.colors.join(" · ")}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 穿着日历 */}
      <div style={{ marginTop: 32 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#1a1a1a",
            margin: "0 0 16px",
          }}
        >
          穿着日历
        </h3>
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
