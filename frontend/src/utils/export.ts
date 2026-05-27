import type { ClothingItem } from "../types";
import { CATEGORY_LABELS } from "../types";

function csvEscape(value: string | number | null | undefined): string {
  const s = String(value ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

const HEADERS = [
  "名称", "品类", "子品类", "颜色", "品牌", "材质",
  "季节", "风格", "温度范围", "购入价格", "穿着次数", "最后穿着",
];

export function exportItemsCsv(items: ClothingItem[]) {
  const rows = items.map((item) => [
    item.name || item.sub_category,
    CATEGORY_LABELS[item.category] || item.category,
    item.sub_category,
    (item.colors || []).join("、"),
    item.brand || "",
    (item.material || []).join("、"),
    (item.seasons || []).join("、"),
    (item.style_tags || []).join("、"),
    `${item.temp_min}°C ~ ${item.temp_max}°C`,
    item.purchase_price || 0,
    item.wear_count,
    item.last_worn_date || "从未",
  ].map(csvEscape).join(","));

  const bom = "﻿"; // UTF-8 BOM for Excel
  const csv = bom + [HEADERS.join(","), ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AiCloset_衣橱导出_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
