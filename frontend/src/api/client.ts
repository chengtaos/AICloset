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

// ── access token 内存存储（非 localStorage，防 XSS）──
let _accessToken: string | null = null;
let _refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken() {
  return _accessToken;
}

// ── 请求拦截器：自动附加 Bearer token ──
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// ── 响应拦截器：401 自动静默刷新 ──
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url || "";

    // 登录/注册/刷新接口的 401 不触发刷新（避免死循环）
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh");

    if (status === 401 && !isAuthEndpoint && !error.config._retry) {
      error.config._retry = true;

      // 去重：多个并发 401 只刷新一次
      if (!_refreshPromise) {
        _refreshPromise = (async () => {
          try {
            const { data } = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
            _accessToken = data.token;
            return data.token;
          } catch {
            _accessToken = null;
            return null;
          } finally {
            _refreshPromise = null;
          }
        })();
      }

      const newToken = await _refreshPromise;
      if (newToken) {
        // 重试原始请求
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(error.config);
      }

      // 刷新失败 → 跳转登录
      window.location.href = "/login";
    }

    // 登出接口返回 401 直接跳转
    if (status === 401 && url.includes("/auth/logout")) {
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default api;

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
  items: ClothingItemCreate[];
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
