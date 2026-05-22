import axios from "axios";
import type {
  ClothingItem,
  ClothingItemCreate,
  Outfit,
  OutfitCreate,
  WearRecord,
  WearRecordCreate,
  RecommendResponse,
  WardrobeStats,
} from "../types";

const api = axios.create({ baseURL: "/api" });

// ── 衣橱 ──

export async function fetchItems(params?: {
  category?: string;
  season?: string;
  style?: string;
  search?: string;
  sort?: string;
}) {
  const { data } = await api.get<ClothingItem[]>("/wardrobe/items", { params });
  return data;
}

export async function fetchItem(id: number) {
  const { data } = await api.get<ClothingItem>(`/wardrobe/items/${id}`);
  return data;
}

export async function createItem(item: ClothingItemCreate) {
  const { data } = await api.post<ClothingItem>("/wardrobe/items", item);
  return data;
}

export async function updateItem(id: number, item: Partial<ClothingItemCreate>) {
  const { data } = await api.put<ClothingItem>(`/wardrobe/items/${id}`, item);
  return data;
}

export async function deleteItem(id: number) {
  await api.delete(`/wardrobe/items/${id}`);
}

export interface AutoClassifyResult {
  category: string;
  sub_category: string;
  colors: string[];
  style_tags: string[];
  seasons: string[];
  material: string[];
  temp_min: number;
  temp_max: number;
  image_path: string;
}

export async function autoClassify(file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<AutoClassifyResult>("/wardrobe/auto-classify", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadImage(itemId: number, file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<ClothingItem>(
    `/wardrobe/items/${itemId}/images`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function fetchStats() {
  const { data } = await api.get<WardrobeStats>("/wardrobe/stats");
  return data;
}

// ── 穿着记录 ──

export async function fetchWearRecords(year?: number, month?: number) {
  const { data } = await api.get<WearRecord[]>("/wardrobe/wear-records", {
    params: { year, month },
  });
  return data;
}

export async function recordWear(record: WearRecordCreate) {
  const { data } = await api.post<WearRecord>("/wardrobe/wear-records", record);
  return data;
}

// ── 搭配 ──

export async function fetchOutfits() {
  const { data } = await api.get<Outfit[]>("/outfits");
  return data;
}

export async function createOutfit(outfit: OutfitCreate) {
  const { data } = await api.post<Outfit>("/outfits", outfit);
  return data;
}

export async function deleteOutfit(id: number) {
  await api.delete(`/outfits/${id}`);
}

// ── 推荐 ──

export async function recommendDaily(city: string, occasion?: string) {
  const { data } = await api.post<RecommendResponse>("/recommend/daily", {
    city,
    occasion: occasion || "",
  });
  return data;
}

export async function recommendScenario(description: string, city: string) {
  const { data } = await api.post<RecommendResponse>("/recommend/scenario", {
    description,
    city,
  });
  return data;
}
