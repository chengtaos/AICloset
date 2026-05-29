import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal, Select, Upload, message } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { ClothingItem, ClothingItemCreate } from "../types";
import { CATEGORY_LABELS, COLORS_PRESET, SEASONS, STYLE_TAGS } from "../types";
import { createItem, deleteItem, fetchItems, updateItem, uploadImage } from "../api/client";
import { getImageUrl } from "../utils/imageUrl";
import { exportItemsCsv } from "../utils/export";
import { useResponsive } from "../hooks/useResponsive";
import { colors, radii, shadows, spacing, fontWeight } from "../styles/tokens";
import EmptyState from "./ui/EmptyState";
import ItemCard from "./ItemCard";
import ItemForm from "./ItemForm";
import Tag from "./ui/Tag";

const CATEGORIES = [
  { key: "", label: "全部" },
  ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label })),
];

function confirmDelete(onOk: () => void) {
  Modal.confirm({
    title: "删除这件衣物？",
    okText: "删除",
    okType: "danger",
    cancelText: "取消",
    onOk,
  });
}

export default function WardrobeView() {
  const queryClient = useQueryClient();
  const { isMobile, isTablet } = useResponsive();
  const [activeCat, setActiveCat] = useState("");
  const [search, setSearch] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [statusFilter, setStatusFilter] = useState("available");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const pendingImageFile = useRef<File | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["items", seasonFilter, styleFilter, sortBy, statusFilter],
    queryFn: () =>
      fetchItems({
        season: seasonFilter || undefined,
        style: styleFilter || undefined,
        sort: sortBy,
        status: statusFilter,
      }),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadImage(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      message.success("图片已上传");
    },
  });

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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ClothingItemCreate> }) => updateItem(id, data),
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

  const handleBatchCreate = async (batch: ClothingItemCreate[]) => {
    let count = 0;
    for (const item of batch) {
      try {
        await createItem(item);
        count += 1;
      } catch {
        message.error(`${item.sub_category} 录入失败`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["items"] });
    message.success(`已录入 ${count} 件`);
    setFormOpen(false);
  };

  const filtered = useMemo(() => {
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
    return list;
  }, [items, activeCat, colorFilter, search]);

  const editingItem = editingId != null ? items.find((i) => i.id === editingId) ?? null : null;
  const detailItem = detailId != null ? items.find((i) => i.id === detailId) : null;

  return (
    <div>
      <div className="xhs-toolbar" style={{ marginBottom: 22 }}>
        <div className="xhs-chip-row">
          {CATEGORIES.map(({ key, label }) => {
            const active = activeCat === key;
            const count = key ? items.filter((i) => i.category === key).length : items.length;
            return (
              <button
                key={key}
                onClick={() => setActiveCat(key)}
                style={{
                  border: "none",
                  borderRadius: radii.full,
                  background: active ? colors.accent : "rgba(255,255,255,0.72)",
                  color: active ? colors.surface : colors.textSecondary,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: active ? "0 10px 24px rgba(217,75,72,0.20)" : "none",
                }}
              >
                {label}
                <span style={{ marginLeft: 5, opacity: 0.65 }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "minmax(180px,1fr) 120px 130px 120px 130px 110px auto auto",
            gap: 10,
            alignItems: "center",
          }}
        >
          <Input
            prefix={<SearchOutlined style={{ color: colors.textTertiary }} />}
            placeholder="搜索单品、颜色、风格"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ gridColumn: isMobile ? "1 / -1" : undefined }}
          />
          <Select
            placeholder="季节"
            value={seasonFilter || undefined}
            onChange={(v) => setSeasonFilter(v || "")}
            allowClear
            options={SEASONS.map((s) => ({ value: s, label: s }))}
          />
          <Select
            placeholder="风格"
            value={styleFilter || undefined}
            onChange={(v) => setStyleFilter(v || "")}
            allowClear
            showSearch
            options={STYLE_TAGS.map((s) => ({ value: s, label: s }))}
          />
          <Select
            placeholder="颜色"
            value={colorFilter || undefined}
            onChange={(v) => setColorFilter(v || "")}
            allowClear
            showSearch
            options={COLORS_PRESET.map((c) => ({ value: c, label: c }))}
          />
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "created_at", label: "最新" },
              { value: "-created_at", label: "最早" },
              { value: "wear_count", label: "常穿" },
              { value: "-wear_count", label: "少穿" },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "available", label: "可穿" },
              { value: "laundry", label: "待洗" },
              { value: "archived", label: "归档" },
            ]}
          />
          <Button onClick={() => exportItemsCsv(items)} disabled={items.length === 0}>
            导出
          </Button>
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => {
              setEditingId(null);
              setFormOpen(true);
            }}
          >
            录入
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: 16, color: colors.textSecondary, fontSize: 13 }}>
        正在展示 {filtered.length} 篇衣物笔记
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="衣"
          title={items.length === 0 ? "衣橱还是空的" : "没有匹配的衣物"}
          description={items.length === 0 ? "点击录入，添加第一件值得被看见的单品。" : undefined}
        />
      ) : (
        <div className="xhs-feed">
          {filtered.map((item) => (
            <div className="xhs-feed-item" key={item.id}>
              <ItemCard
                item={item}
                onClick={() => setDetailId(item.id)}
                onDelete={() => confirmDelete(() => deleteMutation.mutate(item.id))}
              />
            </div>
          ))}
        </div>
      )}

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
            if (imageFile && !values.image_path) pendingImageFile.current = imageFile;
            createMutation.mutate(values);
          }
        }}
        onBatchSubmit={handleBatchCreate}
      />

      <Modal
        open={detailId != null && detailItem != null}
        onCancel={() => setDetailId(null)}
        footer={null}
        width={isMobile ? undefined : 760}
        closable={false}
      >
        {detailItem && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(260px, 0.95fr) 1fr",
              gap: isMobile ? 18 : 24,
            }}
          >
            <div
              style={{
                aspectRatio: "3/4",
                borderRadius: radii.xl,
                background: colors.placeholder,
                overflow: "hidden",
                boxShadow: shadows.card,
              }}
            >
              {detailItem.images.length > 0 && (
                <img
                  src={getImageUrl(detailItem.images[0])}
                  alt={detailItem.name || detailItem.sub_category}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>

            <div>
              <div style={{ color: colors.accent, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                {CATEGORY_LABELS[detailItem.category]}
              </div>
              <h3 style={{ margin: 0, color: colors.textPrimary, fontSize: 28, lineHeight: 1.15 }}>
                {detailItem.name || detailItem.sub_category}
              </h3>
              {detailItem.name && (
                <div style={{ marginTop: 6, color: colors.textSecondary }}>{detailItem.sub_category}</div>
              )}

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 18 }}>
                {detailItem.colors.map((c) => <Tag key={c} variant="filled" size="sm">{c}</Tag>)}
                {detailItem.style_tags.map((t) => <Tag key={t} variant="outline" size="sm">{t}</Tag>)}
              </div>

              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: radii.lg,
                  background: colors.placeholder,
                  color: colors.textSecondary,
                  fontSize: 13,
                  lineHeight: 2,
                }}
              >
                {detailItem.brand && <div>品牌：{detailItem.brand}</div>}
                <div>季节：{detailItem.seasons.length ? detailItem.seasons.join("、") : "未设置"}</div>
                <div>温度：{detailItem.temp_min}°C 到 {detailItem.temp_max}°C</div>
                <div>材质：{detailItem.material.length ? detailItem.material.join("、") : "未设置"}</div>
                <div>穿过：{detailItem.wear_count} 次</div>
                <div>录入：{new Date(detailItem.created_at).toLocaleDateString("zh-CN")}</div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
                <Upload
                  showUploadList={false}
                  beforeUpload={(file) => {
                    uploadMutation.mutate({ id: detailItem.id, file });
                    return false;
                  }}
                >
                  <Button icon={<UploadOutlined />}>图片</Button>
                </Upload>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    setDetailId(null);
                    setEditingId(detailItem.id);
                    setFormOpen(true);
                  }}
                >
                  编辑
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={() => confirmDelete(() => deleteMutation.mutate(detailItem.id))}>
                  删除
                </Button>
              </div>

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 16 }}>
                {(["available", "laundry", "archived"] as const).map((s) => {
                  const labels = { available: "可穿", laundry: "待洗", archived: "归档" };
                  const active = detailItem.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => updateMutation.mutate({ id: detailItem.id, data: { status: s } })}
                      style={{
                        border: "none",
                        borderRadius: radii.full,
                        background: active ? colors.accent : colors.placeholder,
                        color: active ? colors.surface : colors.textSecondary,
                        padding: "7px 13px",
                        fontWeight: active ? fontWeight.semibold : fontWeight.medium,
                        cursor: "pointer",
                      }}
                    >
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
