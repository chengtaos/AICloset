import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, Input, Button, Modal, Upload, message } from "antd";
import { PlusOutlined, UploadOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ClothingItemCreate } from "../types";
import { CATEGORY_LABELS, SEASONS, STYLE_TAGS } from "../types";
import { fetchItems, createItem, updateItem, deleteItem, uploadImage } from "../api/client";
import ItemCard from "../components/ItemCard";
import ItemForm from "../components/ItemForm";

export default function WardrobePage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ category?: string; season?: string; style?: string; search?: string }>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["items", filters],
    queryFn: () => fetchItems(filters),
  });

  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["items"] }); message.success("已录入"); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ClothingItemCreate> }) => updateItem(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["items"] }); message.success("已更新"); setFormOpen(false); setEditingItem(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["items"] }); message.success("已删除"); setDetailId(null); },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadImage(id, file),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["items"] }); message.success("图片已上传"); },
  });

  const editingData = editingItem != null ? items.find((i) => i.id === editingItem) ?? null : null;
  const detailItem = detailId != null ? items.find((i) => i.id === detailId) : null;

  const clearFilters = () => setFilters({});

  return (
    <div>
      {/* 标题行 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>衣橱</h2>
        <Button icon={<PlusOutlined />} onClick={() => { setEditingItem(null); setFormOpen(true); }}>
          录入
        </Button>
      </div>

      {/* 筛选栏 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <Select allowClear placeholder="品类" style={{ width: 110 }} size="middle"
          options={Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          value={filters.category} onChange={(v) => setFilters((f) => ({ ...f, category: v }))} />
        <Select allowClear placeholder="季节" style={{ width: 100 }} size="middle"
          options={SEASONS.map((s) => ({ value: s, label: s }))}
          value={filters.season} onChange={(v) => setFilters((f) => ({ ...f, season: v }))} />
        <Select allowClear placeholder="风格" style={{ width: 110 }} size="middle"
          options={STYLE_TAGS.map((s) => ({ value: s, label: s }))}
          value={filters.style} onChange={(v) => setFilters((f) => ({ ...f, style: v }))} />
        <Input.Search placeholder="搜索" style={{ width: 180 }} size="middle" allowClear
          value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))} />
        {Object.values(filters).some(Boolean) && (
          <Button size="middle" type="text" onClick={clearFilters} style={{ color: "#8c8c8c", fontSize: 12 }}>清除</Button>
        )}
      </div>

      {/* 衣橱网格 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(156px, 1fr))",
        gap: 12,
      }}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} onClick={() => setDetailId(item.id)} />
        ))}
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#bfbfbf" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👔</div>
          <div>还没有衣物，点击右上角录入</div>
        </div>
      )}

      {/* 录入/编辑弹窗 */}
      <ItemForm
        open={formOpen}
        editingItem={editingData}
        onClose={() => { setFormOpen(false); setEditingItem(null); }}
        onSubmit={(values) => {
          if (editingItem != null) {
            updateMutation.mutate({ id: editingItem, data: values });
          } else {
            createMutation.mutate(values);
          }
        }}
      />

      {/* 详情弹窗 */}
      <Modal
        open={detailId != null && detailItem != null}
        onCancel={() => setDetailId(null)}
        footer={null}
        width={400}
        title={null}
      >
        {detailItem && (
          <div>
            <div style={{
              width: "100%", aspectRatio: "3/4", background: "#f5f5f5",
              borderRadius: 4, display: "flex", alignItems: "center",
              justifyContent: "center", overflow: "hidden", marginBottom: 16,
            }}>
              {detailItem.images.length > 0 ? (
                <img src={`http://localhost:8000/${detailItem.images[0]}`} alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 64, opacity: 0.12 }}>👤</span>
              )}
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>{detailItem.sub_category}</h3>

            <div style={{ fontSize: 13, color: "#8c8c8c", lineHeight: 1.8 }}>
              <div>{CATEGORY_LABELS[detailItem.category]} · {detailItem.colors.join(" · ")}</div>
              <div>品牌: {detailItem.brand || "—"} · ¥{detailItem.purchase_price}</div>
              <div>风格: {detailItem.style_tags.join(" · ") || "—"}</div>
              <div>季节: {detailItem.seasons.join(" · ") || "—"}</div>
              <div>温度: {detailItem.temp_min}°C – {detailItem.temp_max}°C</div>
              <div>材质: {detailItem.material.join(" · ") || "—"}</div>
              <div>穿过 {detailItem.wear_count} 次</div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 20, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
              <Upload showUploadList={false} beforeUpload={(file) => { uploadMutation.mutate({ id: detailItem.id, file }); return false; }}>
                <Button size="small" icon={<UploadOutlined />}>图片</Button>
              </Upload>
              <Button size="small" icon={<EditOutlined />} onClick={() => { setDetailId(null); setEditingItem(detailItem.id); setFormOpen(true); }}>
                编辑
              </Button>
              <Button size="small" danger icon={<DeleteOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: "删除这件衣物？",
                    okText: "删除",
                    okType: "danger",
                    cancelText: "取消",
                    onOk: () => deleteMutation.mutate(detailItem.id),
                  });
                }}>
                删除
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
