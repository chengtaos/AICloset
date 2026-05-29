import type { ClothingItem, WardrobeStats } from "../types";

// ── 风格原型 ──
export interface StyleArchetype {
  id: string;
  name: string;       // 中文名
  enName: string;      // 英文名
  description: string; // 2-3 句人格化描述
  emoji: string;
}

// ── 人格维度 ──
export interface TraitDimension {
  key: string;
  label: string;
  left: string;   // 0% 端标签
  right: string;   // 100% 端标签
  value: number;   // 0-100
}

// ── 完整风格画像 ──
export interface StyleProfile {
  archetype: StyleArchetype;
  dimensions: TraitDimension[];
  topColors: string[];    // top 5 颜色
  topTags: string[];      // top 5 风格标签
}

// ── 风格原型定义 ──
const ARCHETYPES: StyleArchetype[] = [
  {
    id: "minimalist",
    name: "极简实用者",
    enName: "THE MINIMALIST",
    description: "你的衣橱以基础款为骨架，黑白灰是安全区。你信奉\"少即是多\"，每一件单品都经过考量——不追逐潮流，却始终得体。",
    emoji: "🧥",
  },
  {
    id: "trendsetter",
    name: "潮流先锋者",
    enName: "THE TRENDSETTER",
    description: "你对流行趋势保持敏锐嗅觉，衣橱里总有当季最热单品。你享受穿搭的乐趣，用服装表达态度，从不甘于平庸。",
    emoji: "🔥",
  },
  {
    id: "vintage_soul",
    name: "文艺复古者",
    enName: "THE VINTAGE SOUL",
    description: "你在旧时光里寻找灵感，大地色系和独特廓形是你的语言。材质和细节比品牌更重要，每一套搭配都像在讲一个故事。",
    emoji: "📜",
  },
  {
    id: "urban_chic",
    name: "都市精致者",
    enName: "THE URBAN CHIC",
    description: "你的衣橱是精致生活的延伸。剪裁考究、面料上乘，你不追潮流，因为你就是潮流本身。通勤和社交之间切换自如。",
    emoji: "✨",
  },
  {
    id: "free_spirit",
    name: "自由随性者",
    enName: "THE FREE SPIRIT",
    description: "你不被任何风格定义，衣橱里混搭着多种可能。舒适是底线，但从不放弃有趣。今天的你和昨天的你，可以完全不同。",
    emoji: "🌿",
  },
  {
    id: "active_soul",
    name: "运动活力者",
    enName: "THE ACTIVE SOUL",
    description: "运动不只是习惯，更是生活方式。你的衣橱为随时出发做好准备，功能性与颜值并重，活力是你最好的配饰。",
    emoji: "⚡",
  },
];

// ── 风格标签 → 潮流/经典 映射 ──
const TRENDY_TAGS = new Set([
  "街头", "辣妹风", "纯欲风", "Y2K", "芭蕾风", "多巴胺", "美拉德",
  "波西米亚", "机车风", "Athleisure", "Gorpcore", "工装风",
]);

const CLASSIC_TAGS = new Set([
  "通勤", "极简", "正式", "法式", "老钱风", "静奢风", "学院风",
  "Clean Fit", "韩系", "日系",
]);

const NEUTRAL_COLORS = new Set([
  "白色", "黑色", "灰色", "藏青", "卡其色", "棕色", "米色",
  "燕麦色", "奶油白", "大象灰", "炭灰",
]);

const BOLD_COLORS = new Set([
  "红色", "粉色", "橙色", "黄色", "绿色", "蓝色", "紫色",
  "酒红", "玫红", "珊瑚橘", "鹅黄", "克莱因蓝", "宝蓝",
  "多巴胺",
]);

// ── 品类与人格维度映射 ──
const FORMAL_CATEGORIES = new Set(["blouse", "outer"]);
const CASUAL_CATEGORIES = new Set(["tshirt", "hoodie", "shorts"]);
const EXPRESSIVE_CATEGORIES = new Set(["dress", "skirt", "accessory"]);
const ACTIVE_CATEGORIES = new Set(["sweater"]); // hoodie already in casual

function countByCategory(items: ClothingItem[], set: Set<string>): number {
  return items.filter((i) => set.has(i.category)).length;
}

function countStyleTags(items: ClothingItem[], set: Set<string>): number {
  let count = 0;
  for (const item of items) {
    for (const tag of item.style_tags) {
      if (set.has(tag)) count++;
    }
  }
  return count;
}

function countColors(items: ClothingItem[], set: Set<string>): number {
  let count = 0;
  for (const item of items) {
    for (const color of item.colors) {
      if (set.has(color)) count++;
    }
  }
  return count;
}

// ── 主计算函数 ──
export function computeStyleProfile(
  items: ClothingItem[],
  stats: WardrobeStats | undefined,
): StyleProfile | null {
  if (!items || items.length === 0) return null;
  if (!stats) return null;

  // ── 维度 1：风格取向（经典 0 ↔ 100 潮流）──
  const trendyCount = countStyleTags(items, TRENDY_TAGS);
  const classicCount = countStyleTags(items, CLASSIC_TAGS);
  const totalStyleTags = trendyCount + classicCount;
  const styleTrend = totalStyleTags > 0
    ? Math.round((trendyCount / totalStyleTags) * 100)
    : 50;

  // ── 维度 2：色彩倾向（沉稳 0 ↔ 100 大胆）──
  const neutralColorCount = countColors(items, NEUTRAL_COLORS);
  const boldColorCount = countColors(items, BOLD_COLORS);
  const totalColorHits = neutralColorCount + boldColorCount;
  const colorBold = totalColorHits > 0
    ? Math.round((boldColorCount / totalColorHits) * 100)
    : 50;

  // ── 维度 3：搭配复杂度（简约 0 ↔ 100 繁复）──
  // 基于品类多样性 + 配饰占比
  const uniqueCategories = new Set(items.map((i) => i.category)).size;
  const accessoryRatio = items.length > 0
    ? items.filter((i) => i.category === "accessory" || i.category === "bag").length / items.length
    : 0;
  const complexityRaw = (uniqueCategories / 12) * 60 + accessoryRatio * 100;
  const complexity = Math.round(Math.min(100, Math.max(0, complexityRaw)));

  // ── 维度 4：功能导向（实用 0 ↔ 100 个性）──
  const expressiveCount = countByCategory(items, EXPRESSIVE_CATEGORIES);
  const totalItems = items.length;
  const expression = totalItems > 0
    ? Math.round((expressiveCount / totalItems) * 100 * 1.5) // 放大系数
    : 50;
  const expressionNorm = Math.min(100, Math.max(0, expression));

  // ── 判定原型 ──
  const archetype = determineArchetype(styleTrend, colorBold, complexity, expressionNorm);

  // ── top colors ──
  const topColors = stats.color_distribution
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((c) => c.category);

  // ── top tags ──
  const tagCounts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.style_tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    archetype,
    dimensions: [
      { key: "style", label: "风格取向", left: "经典主义", right: "潮流主义", value: styleTrend },
      { key: "color", label: "色彩倾向", left: "沉稳克制", right: "大胆多彩", value: colorBold },
      { key: "complexity", label: "搭配复杂度", left: "简约基础", right: "繁复层次", value: complexity },
      { key: "expression", label: "功能导向", left: "实用主义", right: "个性表达", value: expressionNorm },
    ],
    topColors,
    topTags,
  };
}

function determineArchetype(
  styleTrend: number,
  colorBold: number,
  complexity: number,
  expression: number,
): StyleArchetype {
  // 高个性化 + 高复杂度 → 自由随性 或 文艺复古
  if (expression > 60 && complexity > 50) {
    return colorBold < 50 ? ARCHETYPES[2] : ARCHETYPES[4]; // vintage_soul or free_spirit
  }
  // 高潮流 + 大胆色 → 潮流先锋
  if (styleTrend > 55 && colorBold > 45) {
    return ARCHETYPES[1]; // trendsetter
  }
  // 低潮流 + 低复杂度 + 低调色 → 极简实用
  if (styleTrend < 45 && complexity < 50 && colorBold < 50) {
    return ARCHETYPES[0]; // minimalist
  }
  // 中等潮流 + 中高复杂度 + 偏正式 → 都市精致
  if (complexity > 40 && expression > 40 && colorBold < 60) {
    return ARCHETYPES[3]; // urban_chic
  }
  // 偏运动休闲 → 运动活力
  if (styleTrend < 55 && colorBold > 40 && complexity < 50) {
    return ARCHETYPES[5]; // active_soul
  }
  // 默认：选最接近的原型
  const scores: [number, StyleArchetype][] = [
    [Math.abs(styleTrend - 20) + Math.abs(colorBold - 20) + Math.abs(complexity - 20) + Math.abs(expression - 30), ARCHETYPES[0]], // minimalist
    [Math.abs(styleTrend - 80) + Math.abs(colorBold - 75) + Math.abs(complexity - 60) + Math.abs(expression - 70), ARCHETYPES[1]], // trendsetter
    [Math.abs(styleTrend - 35) + Math.abs(colorBold - 30) + Math.abs(complexity - 65) + Math.abs(expression - 75), ARCHETYPES[2]], // vintage_soul
    [Math.abs(styleTrend - 40) + Math.abs(colorBold - 35) + Math.abs(complexity - 55) + Math.abs(expression - 55), ARCHETYPES[3]], // urban_chic
    [Math.abs(styleTrend - 50) + Math.abs(colorBold - 55) + Math.abs(complexity - 70) + Math.abs(expression - 80), ARCHETYPES[4]], // free_spirit
    [Math.abs(styleTrend - 30) + Math.abs(colorBold - 55) + Math.abs(complexity - 30) + Math.abs(expression - 35), ARCHETYPES[5]], // active_soul
  ];
  scores.sort(([a], [b]) => a - b);
  return scores[0][1];
}

// ── 颜色名 → 色值映射（用于可视化）──
export const COLOR_SWATCH: Record<string, string> = {
  "白色": "#f5f5f5", "黑色": "#2c2c2c", "灰色": "#9e9e9e", "藏青": "#1a3a5c",
  "卡其色": "#c4a97d", "棕色": "#7b5b3a", "米色": "#e8dcc8", "燕麦色": "#d4c4a8",
  "奶油白": "#faf8f2", "大象灰": "#8a8a8a", "炭灰": "#4a4a4a",
  "红色": "#d43535", "粉色": "#f0a0b0", "橙色": "#f08040", "黄色": "#f0d060",
  "绿色": "#5a9050", "蓝色": "#5080c0", "紫色": "#8060b0",
  "酒红": "#8b1a2b", "裸粉": "#e8c4c0", "雾霾蓝": "#8fa8bc",
  "牛油果绿": "#8a9a5b", "香芋紫": "#b8a0c8", "克莱因蓝": "#002fa7",
  "勃艮第红": "#6b1c2a", "焦糖色": "#af6e3c", "军绿": "#5a6236",
  "宝蓝": "#1a3fa8", "玫红": "#d02060", "珊瑚橘": "#e87050",
  "婴儿蓝": "#b0c8e8", "淡紫": "#c8b8d8", "鹅黄": "#f8e890",
};
