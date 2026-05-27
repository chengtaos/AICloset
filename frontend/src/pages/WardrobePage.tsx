import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Modal, Upload, message, Input, Select } from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ClothingItem, ClothingItemCreate } from "../types";
import { CATEGORY_LABELS, SEASONS, STYLE_TAGS, COLORS_PRESET } from "../types";
import { fetchItems, createItem, updateItem, deleteItem, uploadImage } from "../api/client";
import { getImageUrl } from "../utils/imageUrl";
import { exportItemsCsv } from "../utils/export";
import { useResponsive } from "../hooks/useResponsive";
import ItemCard from "../components/ItemCard";
import ItemForm from "../components/ItemForm";

// 品类筛选标签：全部 + 各品类
const CATEGORIES = [
  { key: "", label: "全部" },
  ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label })),
];

// 删除确认对话框，多处复用避免重复代码
function confirmDelete(onOk: () => void) {
  Modal.confirm({
    title: "删除这件衣物？",
    okText: "删除",
    okType: "danger",
    cancelText: "取消",
    onOk,
  });
}

export default function WardrobePage() {
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const [activeCat, setActiveCat] = useState("");
  const [search, setSearch] = useState("");
  const [seasonFilter, setSeasonFilter] = useState<string>("");
  const [styleFilter, setStyleFilter] = useState<string>("");
  const [colorFilter, setColorFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [statusFilter, setStatusFilter] = useState<string>("available");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["items", seasonFilter, styleFilter, sortBy, statusFilter],
    queryFn: () => fetchItems({ season: seasonFilter || undefined, style: styleFilter || undefined, sort: sortBy, status: statusFilter }),
  });

  // 暂存待上传图片：先创建 item 再绑定图片
  const pendingImageFile = useRef<File | null>(null);

  // 创建衣物：成功后若有待上传图片则触发上传
  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: (item: ClothingItem) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      if (pendingImageFile.current) {
        uploadMutation.mutate({ id: item.id, file: pendingImageFile.current });
        pendingImageFile.current = null;
      }
      message.success("已录入");
      setFormOpen(false);
    },
  });

  // 批量录入：AI 识别后可能返回多件，逐件创建
  const handleBatchCreate = async (items: ClothingItemCreate[]) => {
    let count = 0;
    for (const item of items) {
      try {
        await createItem(item);
        count++;
      } catch {
        message.error(`${item.sub_category} 录入失败`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["items"] });
    message.success(`已录入 ${count} 件`);
    setFormOpen(false);
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ClothingItemCreate> }) =>
      updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      message.success("已更新");
      setFormOpen(false);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      message.success("已删除");
      setDetailId(null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadImage(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      message.success("图片已上传");
    },
  });

  // 筛选 + 按品类分组：先过滤再归入各组，用于全部视图的分组展示
  const { filtered, grouped } = useMemo(() => {
    let list = items;
    if (activeCat) list = list.filter((i) => i.category === activeCat);
    if (colorFilter) list = list.filter((i) => i.colors.some((c) => c.includes(colorFilter)));
    if (search) {
      const kw = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.name || "").toLowerCase().includes(kw) ||
          i.sub_category.toLowerCase().includes(kw) ||
          i.colors.some((c) => c.includes(kw)) ||
          i.style_tags.some((t) => t.includes(kw)),
      );
    }
    const groups: Record<string, typeof items> = {};
    for (const item of list) {
      const cat = item.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return { filtered: list, grouped: groups };
  }, [items, activeCat, search, colorFilter]);

  const editingItem =
    editingId != null ? items.find((i) => i.id === editingId) ?? null : null;
  const detailItem = detailId != null ? items.find((i) => i.id === detailId) : null;

  return (
    <div>
      {/* 标题栏：件数统计 + 录入按钮 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 24,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            衣橱
          </h2>
          <div style={{ fontSize: 13, color: "#999", marginTop: 2 }}>
            {filtered.length} 件
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            size="small"
            onClick={() => exportItemsCsv(items)}
            disabled={items.length === 0}
            style={{ fontSize: 12 }}
          >
            导出 CSV
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingId(null);
              setFormOpen(true);
            }}
          >
            录入
          </Button>
        </div>
      </div>

      {/* 品类标签栏 + 搜索 */}
      <div
        style={{
          display: "flex",
          gap: 2,
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 2,
            flexWrap: isMobile ? "nowrap" : "wrap",
            overflowX: isMobile ? "auto" : "visible",
            flex: 1,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {CATEGORIES.map(({ key, label }) => {
            const active = activeCat === key;
            const count = key ? items.filter((i) => i.category === key).length : items.length;
            return (
              <button
                key={key}
                onClick={() => setActiveCat(key)}
                style={{
                  border: "none",
                  background: active ? "#f0f2f5" : "transparent",
                  padding: "6px 14px",
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "#1a1a1a" : "#999",
                  cursor: "pointer",
                  borderRadius: 4,
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {label}
                <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {!isMobile && <div style={{ flex: 1 }} />}

        <Select
          placeholder="季节"
          size="small"
          value={seasonFilter || undefined}
          onChange={(v) => setSeasonFilter(v || "")}
          allowClear
          options={SEASONS.map((s) => ({ value: s, label: s }))}
          style={{ width: 80, flexShrink: 0 }}
        />
        <Select
          placeholder="风格"
          size="small"
          value={styleFilter || undefined}
          onChange={(v) => setStyleFilter(v || "")}
          allowClear
          showSearch
          options={STYLE_TAGS.map((s) => ({ value: s, label: s }))}
          style={{ width: 100, flexShrink: 0 }}
        />
        <Select
          placeholder="颜色"
          size="small"
          value={colorFilter || undefined}
          onChange={(v) => setColorFilter(v || "")}
          allowClear
          showSearch
          options={COLORS_PRESET.map((c) => ({ value: c, label: c }))}
          style={{ width: 90, flexShrink: 0 }}
        />
        <Select
          size="small"
          value={sortBy}
          onChange={setSortBy}
          options={[
            { value: "created_at", label: "最新" },
            { value: "-created_at", label: "最旧" },
            { value: "wear_count", label: "穿最多" },
            { value: "-wear_count", label: "穿最少" },
          ]}
          style={{ width: 88, flexShrink: 0 }}
        />
        <Select
          size="small"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "available", label: "可穿" },
            { value: "laundry", label: "待洗" },
            { value: "archived", label: "已归档" },
          ]}
          style={{ width: 80, flexShrink: 0 }}
        />

        <Input
          prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
          placeholder="搜索"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{
            width: isMobile ? 120 : 140,
            flexShrink: 0,
            border: "1px solid #e8eaed",
            borderRadius: 4,
          }}
        />
      </div>

      {/* 内容区域：空状态 / 单品类网格 / 全部分组网格 */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "100px 0", color: "#bfbfbf" }}>
          <div style={{ fontSize: 56, marginBottom: 12, opacity: 0.4 }}>👔</div>
          <div style={{ fontSize: 13 }}>
            {items.length === 0 ? "衣橱还是空的" : "没有匹配的衣物"}
          </div>
        </div>
      ) : activeCat ? (
        // 单品类视图：直接网格排列
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2, 1fr)"
              : "repeat(auto-fill, minmax(148px, 1fr))",
            gap: isMobile ? 10 : 16,
          }}
        >
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => setDetailId(item.id)}
              onDelete={() => confirmDelete(() => deleteMutation.mutate(item.id))}
            />
          ))}
        </div>
      ) : (
        // 全部视图：按品类分组，每组带标题
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {Object.entries(grouped).map(([cat, catItems]) => (
            <section key={cat}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: 14,
                  paddingBottom: 8,
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#1a1a1a",
                    margin: 0,
                  }}
                >
                  {CATEGORY_LABELS[cat] || cat}
                </h3>
                <span style={{ fontSize: 11, color: "#bfbfbf" }}>{catItems.length}</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(2, 1fr)"
                    : "repeat(auto-fill, minmax(148px, 1fr))",
                  gap: isMobile ? 10 : 16,
                }}
              >
                {catItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={() => setDetailId(item.id)}
                    onDelete={() => confirmDelete(() => deleteMutation.mutate(item.id))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 录入/编辑弹窗 */}
      <ItemForm
        open={formOpen}
        editingItem={editingItem}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
        }}
        onSubmit={(values, imageFile) => {
          if (editingId != null) {
            updateMutation.mutate({ id: editingId, data: values });
          } else {
            // 新录入时若有图片文件，先记录待上传，等 item 创建成功后再绑定
            if (imageFile && !values.image_path) {
              pendingImageFile.current = imageFile;
            }
            createMutation.mutate(values);
          }
        }}
        onBatchSubmit={handleBatchCreate}
      />

      {/* 详情弹窗 */}
      <Modal
        open={detailId != null && detailItem != null}
        onCancel={() => setDetailId(null)}
        footer={null}
        width={440}
        closable={false}
      >
        {detailItem && (
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 16 : 20 }}>
            {/* 左侧大图 */}
            <div
              style={{
                width: isMobile ? "100%" : 180,
                maxHeight: isMobile ? 280 : undefined,
                aspectRatio: isMobile ? "3/4" : "3/4",
                background: "#f5f5f5",
                flexShrink: 0,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {detailItem.images.length > 0 ? (
                <img
                  src={getImageUrl(detailItem.images[0])}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d9d9d9"
                  strokeWidth="1"
                >
                  <rect x="2" y="6" width="20" height="13" rx="2" />
                  <circle cx="8.5" cy="10.5" r="1.5" />
                  <path d="M2 15l5-4 4 3 3-5 8 8" />
                </svg>
              )}
            </div>

            {/* 右侧信息 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "#999",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                {CATEGORY_LABELS[detailItem.category]}
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  margin: "0 0 4px",
                  color: "#1a1a1a",
                }}
              >
                {detailItem.name || detailItem.sub_category}
              </h3>
              {detailItem.name && (
                <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 10 }}>
                  {detailItem.sub_category}
                </div>
              )}

              <div style={{ fontSize: 12, color: "#666", lineHeight: 2 }}>
                {detailItem.brand && <div>品牌：{detailItem.brand}</div>}
                <div>颜色：{detailItem.colors.join(" · ")}</div>
                <div>
                  风格：
                  {detailItem.style_tags.length > 0
                    ? detailItem.style_tags.join(" · ")
                    : "—"}
                </div>
                <div>
                  季节：
                  {detailItem.seasons.length > 0
                    ? detailItem.seasons.join(" · ")
                    : "—"}
                </div>
                <div>
                  温度：{detailItem.temp_min}°C – {detailItem.temp_max}°C
                </div>
                <div>
                  材质：
                  {detailItem.material.length > 0
                    ? detailItem.material.join(" · ")
                    : "—"}
                </div>
                {detailItem.purchase_price > 0 && (
                  <div>价格：¥{detailItem.purchase_price}</div>
                )}
                <div>穿过 {detailItem.wear_count} 次</div>
                {detailItem.purchase_price > 0 && detailItem.wear_count > 0 && (
                  <div>
                    次穿着成本：¥
                    {Math.round(detailItem.purchase_price / detailItem.wear_count)}
                  </div>
                )}
                <div>录入：{new Date(detailItem.created_at).toLocaleDateString("zh-CN")}</div>
                <div>
                  上次穿着：
                  {detailItem.last_worn_date
                    ? (() => {
                        const d = new Date(detailItem.last_worn_date);
                        const now = new Date();
                        const diff = Math.floor(
                          (now.getTime() - d.getTime()) / 86400000,
                        );
                        const rel =
                          diff === 0
                            ? "今天"
                            : diff === 1
                              ? "昨天"
                              : `${diff}天前`;
                        return `${rel}（${d.toLocaleDateString("zh-CN")}）`;
                      })()
                    : "从未"}
                </div>
              </div>

              {/* 状态管理 */}
              <div style={{ display: "flex", gap: 6, marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
                <span style={{ fontSize: 11, color: "#bfbfbf", lineHeight: "24px" }}>状态：</span>
                {(["available", "laundry", "archived"] as const).map((s) => {
                  const labels = { available: "可穿", laundry: "待洗", archived: "归档" };
                  const isActive = detailItem.status === s;
                  return (
                    <Button
                      key={s}
                      size="small"
                      type={isActive ? "primary" : "default"}
                      ghost={!isActive}
                      style={{ fontSize: 10 }}
                      onClick={() => updateMutation.mutate({ id: detailItem.id, data: { status: s } })}
                    >
                      {labels[s]}
                    </Button>
                  );
                })}
              </div>

              {/* 详情操作栏 */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 12,
                  paddingTop: 14,
                  borderTop: "1px solid #f0f0f0",
                }}
              >
                <Upload
                  showUploadList={false}
                  beforeUpload={(file) => {
                    uploadMutation.mutate({ id: detailItem.id, file });
                    return false;
                  }}
                >
                  <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 11 }}>
                    图片
                  </Button>
                </Upload>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  style={{ fontSize: 11 }}
                  onClick={() => {
                    setDetailId(null);
                    setEditingId(detailItem.id);
                    setFormOpen(true);
                  }}
                >
                  编辑
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  style={{ fontSize: 11 }}
                  onClick={() => confirmDelete(() => deleteMutation.mutate(detailItem.id))}
                >
                  删除
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
