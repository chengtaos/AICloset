// ── 衣物 ──
export interface ClothingItem {
  id: number;
  user_id: number;
  category: "top" | "bottom" | "outer" | "dress" | "shoes" | "accessory" | "bag";
  sub_category: string;
  colors: string[];
  brand: string;
  material: string[];
  seasons: string[];
  style_tags: string[];
  temp_min: number;
  temp_max: number;
  images: string[];
  purchase_date: string | null;
  purchase_price: number;
  status: string;
  wear_count: number;
  created_at: string;
  updated_at: string;
}

export interface ClothingItemCreate {
  category: string;
  sub_category: string;
  colors?: string[];
  brand?: string;
  material?: string[];
  seasons?: string[];
  style_tags?: string[];
  temp_min?: number;
  temp_max?: number;
  purchase_price?: number;
}

// ── 搭配 ──
export interface OutfitItem {
  item_id: number;
  position: string;
}

export interface Outfit {
  id: number;
  name: string;
  items: OutfitItem[];
  tags: string[];
  is_ai_generated: boolean;
  created_at: string;
}

export interface OutfitCreate {
  name: string;
  items: OutfitItem[];
  tags: string[];
}

// ── 穿着记录 ──
export interface WearRecord {
  id: number;
  user_id: number;
  outfit_id: number | null;
  item_ids: number[];
  wear_date: string;
  photo_url: string;
  note: string;
}

export interface WearRecordCreate {
  outfit_id?: number;
  item_ids: number[];
  wear_date?: string;
  note?: string;
}

// ── 推荐 ──
export interface WeatherInfo {
  city: string;
  temperature: number;
  feels_like: number;
  condition: string;
  humidity: number;
  wind_level: number;
  uv_index: number;
}

export interface ClothingItemBrief {
  id: number;
  category: string;
  sub_category: string;
  colors: string[];
  images: string[];
  style_tags: string[];
}

export interface RecommendSuggestion {
  items: ClothingItemBrief[];
  reason: string;
}

export interface RecommendResponse {
  weather: WeatherInfo;
  suggestions: RecommendSuggestion[];
}

// ── 统计 ──
export interface CategoryStat {
  category: string;
  count: number;
}

export interface WardrobeStats {
  total_items: number;
  total_value: number;
  category_distribution: CategoryStat[];
  color_distribution: CategoryStat[];
  most_worn: ClothingItemBrief[];
  sleeping_items: ClothingItemBrief[];
}

// ── 常量 ──
export const CATEGORY_LABELS: Record<string, string> = {
  top: "上衣",
  bottom: "下装",
  outer: "外套",
  dress: "连衣裙",
  shoes: "鞋子",
  accessory: "配饰",
  bag: "包袋",
};

export const POSITION_LABELS: Record<string, string> = {
  top: "上身",
  bottom: "下身",
  outer: "外套",
  dress: "连衣裙",
  shoes: "鞋子",
  accessory: "配饰",
};

export const SEASONS = ["春", "夏", "秋", "冬"];
export const STYLE_TAGS = ["休闲", "通勤", "运动", "甜美", "复古", "极简", "度假", "街头", "正式", "居家"];
export const SUB_CATEGORIES: Record<string, string[]> = {
  top: ["T恤", "衬衫", "卫衣", "毛衣", "针织衫", "背心", "吊带", "打底衫"],
  bottom: ["牛仔裤", "西裤", "休闲裤", "短裤", "阔腿裤", "半身裙"],
  outer: ["风衣", "西装外套", "牛仔外套", "皮衣", "羽绒服", "棉服", "大衣", "夹克"],
  dress: ["短袖连衣裙", "长袖连衣裙", "吊带裙", "半身裙"],
  shoes: ["运动鞋", "帆布鞋", "乐福鞋", "高跟鞋", "靴子", "凉鞋", "拖鞋"],
  accessory: ["帽子", "围巾", "手套", "腰带", "手表"],
  bag: ["双肩包", "单肩包", "手提包", "斜挎包"],
};

export const CONDITION_ICONS: Record<string, string> = {
  "晴": "☀️", "多云": "⛅", "阴": "☁️",
  "雨": "🌧️", "雷阵雨": "⛈️", "雪": "❄️", "小雪": "🌨️",
};
