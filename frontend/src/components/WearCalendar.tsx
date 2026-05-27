import { useMemo } from "react";
import type { WearRecord, ClothingItem } from "../types";
import { getImageUrl } from "../utils/imageUrl";

interface Props {
  year: number;
  month: number; // 1-12
  records: WearRecord[];
  itemMap: Map<number, ClothingItem>;
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export default function WearCalendar({ year, month, records, itemMap, onMonthChange }: Props) {
  // 构建日 → 记录映射
  const dayRecords = useMemo(() => {
    const map = new Map<number, WearRecord[]>();
    for (const r of records) {
      const d = new Date(r.wear_date).getDate();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(r);
    }
    return map;
  }, [records]);

  // 日历网格计算
  const { days, totalDays, startDayOfWeek } = useMemo(() => {
    const total = new Date(year, month, 0).getDate();
    // 当月第一天是星期几（0=日，1=一...6=六）
    const jsDay = new Date(year, month - 1, 1).getDay();
    const start = jsDay === 0 ? 6 : jsDay - 1; // 转为 0=一 ... 6=日
    return { days: [], totalDays: total, startDayOfWeek: start };
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  const today = new Date();

  return (
    <div>
      {/* 月份切换 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16 }}>
        <button onClick={prevMonth} style={navBtnStyle}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
          {year} 年 {month} 月
        </span>
        <button onClick={nextMonth} style={navBtnStyle}>›</button>
      </div>

      {/* 星期表头 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#8c8c8c", padding: "6px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {/* 前置空白 */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} style={cellStyle} />
        ))}

        {/* 日期单元格 */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const recs = dayRecords.get(day) || [];
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() + 1 === month &&
            today.getDate() === day;

          // 去重收集所有衣物
          const itemIds = new Set<number>();
          for (const r of recs) {
            for (const iid of r.item_ids) itemIds.add(iid);
          }
          const dayItems: ClothingItem[] = [];
          for (const iid of itemIds) {
            const item = itemMap.get(iid);
            if (item) dayItems.push(item);
          }

          return (
            <div
              key={day}
              style={{
                ...cellStyle,
                minHeight: 64,
                background: isToday ? "#f0f2f5" : "#fff",
                border: isToday ? "1px solid #4a5c6c" : "1px solid #f0f0f0",
              }}
            >
              <div style={{
                fontSize: 12, fontWeight: isToday ? 600 : 400,
                color: isToday ? "#4a5c6c" : "#1a1a1a",
                textAlign: "right", marginBottom: 4,
              }}>
                {day}
              </div>
              {/* 缩略图 */}
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {dayItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    title={item.name || item.sub_category}
                    style={{
                      width: 22, height: 28, borderRadius: 2,
                      background: "#f5f5f5", overflow: "hidden",
                    }}
                  >
                    {item.images.length > 0 ? (
                      <img
                        src={getImageUrl(item.images[0])}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "#eee" }} />
                    )}
                  </div>
                ))}
                {dayItems.length > 4 && (
                  <span style={{ fontSize: 10, color: "#999" }}>+{dayItems.length - 4}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  aspectRatio: "1 / 1",
  padding: 4,
  borderRadius: 4,
  overflow: "hidden",
};

const navBtnStyle: React.CSSProperties = {
  border: "none", background: "transparent",
  fontSize: 20, color: "#4a5c6c", cursor: "pointer",
  width: 32, height: 32, display: "flex",
  alignItems: "center", justifyContent: "center",
  borderRadius: 16,
};
