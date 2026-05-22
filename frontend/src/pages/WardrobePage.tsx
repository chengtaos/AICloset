import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Modal, Upload, message, Input } from "antd";
import { PlusOutlined, UploadOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import type { ClothingItem, ClothingItemCreate } from "../types";
import { CATEGORY_LABELS } from "../types";
import { fetchItems, createItem, updateItem, deleteItem, uploadImage } from "../api/client";
import ItemCard from "../components/ItemCard";
import ItemForm from "../components/ItemForm";

const CATEGORIES = [
  { key: "", label: "全部" },
  ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label })),
];

export default function WardrobePage() {
  const queryClient = useQueryClient();
  const [activeCat, setActiveCat] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => fetchItems(),
  });

  const pendingImageFile = useRef<File | null>(null);

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

  const handleBatchCreate = async (items: ClothingItemCreate[], imageFile: File) => {
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
    mutationFn: ({ id, data }: { id: number; data: Partial<ClothingItemCreate> }) => updateItem(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["items"] }); message.success("已更新"); setFormOpen(false); setEditingId(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["items"] }); message.success("已删除"); setDetailId(null); },
  });
  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadImage(id, file),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["items"] }); message.success("图片已上传"); },
  });

  // 筛选 + 按品类分组
  const { filtered, grouped } = useMemo(() => {
    let list = items;
    if (activeCat) list = list.filter((i) => i.category === activeCat);
    if (search) {
      const kw = search.toLowerCase();
      list = list.filter((i) =>
        i.sub_category.toLowerCase().includes(kw) ||
        i.colors.some((c) => c.includes(kw)) ||
        i.style_tags.some((t) => t.includes(kw))
      );
    }
    const groups: Record<string, typeof items> = {};
    for (const item of list) {
      const cat = item.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return { filtered: list, grouped: groups };
  }, [items, activeCat, search]);

  const editingItem = editingId != null ? items.find((i) => i.id === editingId) ?? null : null;
  const detailItem = detailId != null ? items.find((i) => i.id === detailId) : null;

  return (
    <div>
      {/* 标题 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a1a", margin: 0, letterSpacing: "-0.01em" }}>衣橱</h2>
          <div style={{ fontSize: 13, color: "#999", marginTop: 2 }}>{filtered.length} 件</div>
        </div>
        <Button icon={<PlusOutlined />} onClick={() => { setEditingId(null); setFormOpen(true); }}>录入</Button>
      </div>

      {/* 品类标签 */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
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
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? "#1a1a1a" : "#999",
                cursor: "pointer",
                borderRadius: 4,
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {label}<span style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}>{count}</span>
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        <Input
          prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
          placeholder="搜索"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 180, border: "1px solid #e8eaed", borderRadius: 4 }}
        />
      </div>

      {/* 内容 */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "100px 0", color: "#bfbfbf" }}>
          <div style={{ fontSize: 56, marginBottom: 12, opacity: 0.4 }}>👔</div>
          <div style={{ fontSize: 13 }}>{items.length === 0 ? "衣橱还是空的" : "没有匹配的衣物"}</div>
        </div>
      ) : activeCat ? (
        /* 单品类：直接网格 */
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
          gap: 16,
        }}>
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => setDetailId(item.id)}
              onDelete={() => Modal.confirm({
                title: "删除这件衣物？", okText: "删除", okType: "danger", cancelText: "取消",
                onOk: () => deleteMutation.mutate(item.id),
              })}
            />
          ))}
        </div>
      ) : (
        /* 全部：按品类分组 */
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {Object.entries(grouped).map(([cat, catItems]) => (
            <section key={cat}>
              <div style={{
                display: "flex", alignItems: "baseline", gap: 8,
                marginBottom: 14, paddingBottom: 8,
                borderBottom: "1px solid #f0f0f0",
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
                  {CATEGORY_LABELS[cat] || cat}
                </h3>
                <span style={{ fontSize: 11, color: "#bfbfbf" }}>{catItems.length}</span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
                gap: 16,
              }}>
                {catItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={() => setDetailId(item.id)}
                    onDelete={() => Modal.confirm({
                      title: "删除这件衣物？", okText: "删除", okType: "danger", cancelText: "取消",
                      onOk: () => deleteMutation.mutate(item.id),
                    })}
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
        onClose={() => { setFormOpen(false); setEditingId(null); }}
        onSubmit={(values, imageFile) => {
          if (editingId != null) {
            updateMutation.mutate({ id: editingId, data: values });
          } else {
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
          <div style={{ display: "flex", gap: 20 }}>
            {/* 大图 */}
            <div style={{
              width: 180, aspectRatio: "3/4", background: "#f5f5f5",
              flexShrink: 0, overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {detailItem.images.length > 0 ? (
                <img src={`http://localhost:8000/${detailItem.images[0]}`} alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d9d9d9" strokeWidth="1">
                  <rect x="2" y="6" width="20" height="13" rx="2" />
                  <circle cx="8.5" cy="10.5" r="1.5" />
                  <path d="M2 15l5-4 4 3 3-5 8 8" />
                </svg>
              )}
            </div>

            {/* 信息 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                {CATEGORY_LABELS[detailItem.category]}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px", color: "#1a1a1a" }}>
                {detailItem.sub_category}
              </h3>

              <div style={{ fontSize: 12, color: "#666", lineHeight: 2 }}>
                {detailItem.brand && <div>品牌：{detailItem.brand}</div>}
                <div>颜色：{detailItem.colors.join(" · ")}</div>
                <div>风格：{detailItem.style_tags.length > 0 ? detailItem.style_tags.join(" · ") : "—"}</div>
                <div>季节：{detailItem.seasons.length > 0 ? detailItem.seasons.join(" · ") : "—"}</div>
                <div>温度：{detailItem.temp_min}°C – {detailItem.temp_max}°C</div>
                <div>材质：{detailItem.material.length > 0 ? detailItem.material.join(" · ") : "—"}</div>
                {detailItem.purchase_price > 0 && <div>价格：¥{detailItem.purchase_price}</div>}
                <div>穿过 {detailItem.wear_count} 次</div>
                <div>录入：{new Date(detailItem.created_at).toLocaleDateString("zh-CN")}</div>
                <div>
                  上次穿着：
                  {detailItem.last_worn_date
                    ? (() => {
                        const d = new Date(detailItem.last_worn_date);
                        const now = new Date();
                        const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
                        const rel = diff === 0 ? "今天" : diff === 1 ? "昨天" : `${diff}天前`;
                        return `${rel}（${d.toLocaleDateString("zh-CN")}）`;
                      })()
                    : "从未"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid #f0f0f0" }}>
                <Upload showUploadList={false}
                  beforeUpload={(file) => { uploadMutation.mutate({ id: detailItem.id, file }); return false; }}>
                  <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 11 }}>图片</Button>
                </Upload>
                <Button size="small" icon={<EditOutlined />} style={{ fontSize: 11 }}
                  onClick={() => { setDetailId(null); setEditingId(detailItem.id); setFormOpen(true); }}>
                  编辑
                </Button>
                <Button size="small" danger icon={<DeleteOutlined />} style={{ fontSize: 11 }}
                  onClick={() => Modal.confirm({
                    title: "删除这件衣物？", okText: "删除", okType: "danger", cancelText: "取消",
                    onOk: () => deleteMutation.mutate(detailItem.id),
                  })}>
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
