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
  last_worn_date: string | null;
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
  image_path?: string;
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

export const SUB_CATEGORIES: Record<string, string[]> = {
  top: [
    "T恤", "衬衫", "卫衣", "毛衣", "针织衫", "背心", "吊带",
    "打底衫", "雪纺衫", "蕾丝衫", "一字肩", "方领上衣",
    "Polo衫", "短款上衣", "罩衫", "马甲", "抹胸", "泡泡袖",
  ],
  bottom: [
    "牛仔裤", "西裤", "休闲裤", "短裤", "阔腿裤", "半身裙",
    "百褶裙", "A字裙", "包臀裙", "鱼尾裙", "伞裙", "工装裤",
    "瑜伽裤", "骑行裤", "喇叭裤", "直筒裤", "烟管裤", "皮短裤",
    "纱裙", "缎面裙",
  ],
  outer: [
    "风衣", "西装外套", "牛仔外套", "皮衣", "羽绒服", "棉服",
    "大衣", "夹克", "针织开衫", "小香风外套", "棒球服",
    "冲锋衣", "毛呢大衣", "羊羔绒外套", "披肩", "斗篷",
    "摇粒绒外套", "工装外套",
  ],
  dress: [
    "短袖连衣裙", "长袖连衣裙", "吊带裙", "衬衫裙", "茶歇裙",
    "裹身裙", "娃娃裙", "旗袍", "小黑裙", "蕾丝裙", "缎面裙",
    "针织裙", "碎花裙", "波点裙", "格纹裙", "鱼尾连衣裙",
    "抹胸裙", "挂脖裙",
  ],
  shoes: [
    "运动鞋", "帆布鞋", "乐福鞋", "高跟鞋", "靴子", "凉鞋",
    "拖鞋", "玛丽珍鞋", "穆勒鞋", "切尔西靴", "过膝靴",
    "老爹鞋", "芭蕾舞鞋", "厚底鞋", "罗马凉鞋", "细高跟",
    "粗跟鞋", "马丁靴", "雪地靴", "尖头鞋", "方头鞋",
  ],
  accessory: [
    "帽子", "围巾", "手套", "腰带", "手表", "耳环", "项链",
    "手链", "戒指", "发饰", "丝巾", "墨镜", "发箍", "胸针",
    "领巾", "choker",
  ],
  bag: [
    "双肩包", "单肩包", "手提包", "斜挎包", "托特包",
    "腋下包", "法棍包", "水桶包", "链条包", "帆布包",
    "迷你包", "腰包", "邮差包", "云朵包", "草编包",
    "剑桥包", "马鞍包",
  ],
};

export const STYLE_TAGS = [
  // 经典风格
  "休闲", "通勤", "运动", "甜美", "复古", "极简",
  "度假", "街头", "正式", "居家",
  // 流行风格
  "法式", "韩系", "日系", "新中式", "老钱风", "学院风",
  "辣妹风", "纯欲风", "Y2K", "芭蕾风", "静奢风",
  "多巴胺", "美拉德", "波西米亚", "工装风", "机车风",
  "Athleisure", "Clean Fit", "Gorpcore",
];

export const COLORS_PRESET = [
  // 中性色
  "白色", "黑色", "灰色", "藏青", "卡其色", "棕色", "米色",
  "燕麦色", "奶油白", "大象灰", "炭灰",
  // 亮色
  "红色", "粉色", "橙色", "黄色", "绿色", "蓝色", "紫色",
  // 流行色
  "酒红", "裸粉", "雾霾蓝", "牛油果绿", "香芋紫",
  "克莱因蓝", "勃艮第红", "焦糖色", "军绿", "宝蓝",
  "玫红", "珊瑚橘", "婴儿蓝", "淡紫", "鹅黄",
  // 图案
  "条纹", "格纹", "碎花", "波点", "豹纹", "斑马纹", "千鸟格",
];

export const MATERIALS = [
  "棉", "麻", "羊毛", "羊绒", "真丝", "涤纶", "牛仔",
  "皮革", "羽绒", "棉麻", "雪纺", "蕾丝", "缎面",
  "针织", "灯芯绒", "天鹅绒", "欧根纱", "莫代尔",
  "莱赛尔", "醋酸", "PU", "人造皮草", "马海毛",
  "府绸", "丹宁", "麂皮", "漆皮",
];

export const CONDITION_ICONS: Record<string, string> = {
  "晴": "☀️", "多云": "⛅", "阴": "☁️",
  "雨": "🌧️", "雷阵雨": "⛈️", "雪": "❄️", "小雪": "🌨️",
};
