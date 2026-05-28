import { useMemo } from "react";
import type { WearRecord, ClothingItem } from "../types";
import { getImageUrl } from "../utils/imageUrl";
import { colors, radii, spacing, fontSize, fontWeight } from "../styles/tokens";

interface Props {
  year: number;
  month: number;
  records: WearRecord[];
  itemMap: Map<number, ClothingItem>;
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export default function WearCalendar({ year, month, records, itemMap, onMonthChange }: Props) {
  const dayRecords = useMemo(() => {
    const map = new Map<number, WearRecord[]>();
    for (const r of records) {
      const d = new Date(r.wear_date).getDate();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(r);
    }
    return map;
  }, [records]);

  const { totalDays, startDayOfWeek } = useMemo(() => {
    const total = new Date(year, month, 0).getDate();
    const jsDay = new Date(year, month - 1, 1).getDay();
    const start = jsDay === 0 ? 6 : jsDay - 1;
    return { totalDays: total, startDayOfWeek: start };
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16 }}>
        <button onClick={prevMonth} style={{
          border: "none", background: "transparent",
          fontSize: 20, color: colors.accent, cursor: "pointer",
          width: 32, height: 32, display: "flex",
          alignItems: "center", justifyContent: "center",
          borderRadius: radii.full,
        }}>‹</button>
        <span style={{ fontSize: fontSize.subtitle, fontWeight: fontWeight.semibold, color: colors.textPrimary }}>
          {year} 年 {month} 月
        </span>
        <button onClick={nextMonth} style={{
          border: "none", background: "transparent",
          fontSize: 20, color: colors.accent, cursor: "pointer",
          width: 32, height: 32, display: "flex",
          alignItems: "center", justifyContent: "center",
          borderRadius: radii.full,
        }}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: fontSize.caption, color: colors.textSecondary, padding: "6px 0" }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} style={cellStyle} />
        ))}

        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const recs = dayRecords.get(day) || [];
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() + 1 === month &&
            today.getDate() === day;

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
                background: isToday ? colors.accentSoft : "transparent",
                boxShadow: isToday ? `inset 0 0 0 1px ${colors.accent}` : shadows.none,
              }}
            >
              <div style={{
                fontSize: fontSize.body,
                fontWeight: isToday ? fontWeight.semibold : fontWeight.regular,
                color: isToday ? colors.accent : colors.textPrimary,
                textAlign: "right", marginBottom: 4,
              }}>
                {day}
              </div>
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {dayItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    title={item.name || item.sub_category}
                    style={{
                      width: 22, height: 28, borderRadius: 4,
                      background: colors.placeholder, overflow: "hidden",
                    }}
                  >
                    {item.images.length > 0 ? (
                      <img
                        src={getImageUrl(item.images[0])}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: colors.divider }} />
                    )}
                  </div>
                ))}
                {dayItems.length > 4 && (
                  <span style={{ fontSize: 10, color: colors.textSecondary }}>+{dayItems.length - 4}</span>
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
  borderRadius: radii.sm,
  overflow: "hidden",
};

const shadows = { none: "none" };
