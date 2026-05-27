import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Modal, Select, message, Input } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined } from "@ant-design/icons";
import type { ClothingItem, Outfit, OutfitItem } from "../types";
import { CATEGORY_LABELS, POSITION_LABELS } from "../types";
import { fetchItems, fetchOutfits, createOutfit, updateOutfit, deleteOutfit } from "../api/client";
import { getImageUrl } from "../utils/imageUrl";
import OutfitCard from "../components/OutfitCard";

const POSITION_OPTIONS = [
  { value: "upper", label: "上身" },
  { value: "lower", label: "下身" },
  { value: "outer", label: "外套" },
  { value: "dress", label: "连衣裙" },
  { value: "shoes", label: "鞋子" },
  { value: "side", label: "配饰/包袋" },
];

const TAG_OPTIONS = ["通勤", "约会", "聚会", "运动", "度假", "居家", "面试", "日常"];

/** 根据衣物品类自动推断穿搭位置 */
function autoPosition(category: string): string {
  const map: Record<string, string> = {
    blouse: "upper", tshirt: "upper", hoodie: "upper", sweater: "upper",
    outer: "outer",
    pants: "lower", shorts: "lower", skirt: "lower",
    dress: "dress",
    shoes: "shoes",
    bag: "side", accessory: "side",
  };
  return map[category] || "upper";
}

export default function OutfitsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [outfitName, setOutfitName] = useState("");
  const [outfitTags, setOutfitTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<OutfitItem[]>([]);

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => fetchItems(),
  });
  const { data: outfits = [] } = useQuery({
    queryKey: ["outfits"],
    queryFn: fetchOutfits,
  });

  const isEditing = editingId != null;

  const createMutation = useMutation({
    mutationFn: createOutfit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] });
      message.success("搭配已创建");
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ name: string; items: OutfitItem[]; tags: string[] }> }) =>
      updateOutfit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] });
      message.success("搭配已更新");
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOutfit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] });
      message.success("已删除");
    },
  });

  const closeModal = () => {
    setCreateOpen(false);
    setEditingId(null);
    setOutfitName("");
    setOutfitTags([]);
    setSelected([]);
  };

  const openCreate = () => {
    setEditingId(null);
    setOutfitName("");
    setOutfitTags([]);
    setSelected([]);
    setCreateOpen(true);
  };

  const openEdit = (outfit: Outfit) => {
    setEditingId(outfit.id);
    setOutfitName(outfit.name);
    setOutfitTags(outfit.tags);
    setSelected(outfit.items);
    setCreateOpen(true);
  };

  const itemMap = useMemo(() => {
    const map = new Map<number, ClothingItem>();
    items.forEach((it) => map.set(it.id, it));
    return map;
  }, [items]);

  // 客户端筛选：标签 + 搜索
  const filteredOutfits = useMemo(() => {
    let list = outfits;
    if (filterTag) {
      list = list.filter((o) => o.tags.includes(filterTag));
    }
    if (searchText) {
      const kw = searchText.toLowerCase();
      list = list.filter((o) => {
        if (o.name.toLowerCase().includes(kw)) return true;
        // 同时搜索搭配内含的衣物名称
        return o.items.some((oi) => {
          const item = itemMap.get(oi.item_id);
          return item && ((item.name || "").toLowerCase().includes(kw) || item.sub_category.toLowerCase().includes(kw));
        });
      });
    }
    return list;
  }, [outfits, filterTag, searchText, itemMap]);

  // 切换选中：自动推断位置
  const toggleItem = (itemId: number) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.item_id === itemId);
      if (exists) {
        return prev.filter((s) => s.item_id !== itemId);
      }
      const item = itemMap.get(itemId);
      const pos = item ? autoPosition(item.category) : "upper";
      return [...prev, { item_id: itemId, position: pos }];
    });
  };

  const handleSubmit = () => {
    if (!outfitName.trim()) {
      message.warning("请输入搭配名称");
      return;
    }
    if (selected.length === 0) {
      message.warning("请至少选择一件衣物");
      return;
    }
    const payload = {
      name: outfitName.trim(),
      items: selected,
      tags: outfitTags,
    };
    if (isEditing) {
      updateMutation.mutate({ id: editingId!, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>搭配</h2>
        <Button icon={<PlusOutlined />} onClick={openCreate}>创建</Button>
      </div>

      {/* 筛选栏：标签 + 搜索 */}
      {outfits.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          {TAG_OPTIONS.map((tag) => (
            <span
              key={tag}
              onClick={() => setFilterTag((prev) => (prev === tag ? "" : tag))}
              style={{
                fontSize: 12, cursor: "pointer",
                padding: "4px 12px", borderRadius: 4,
                color: filterTag === tag ? "#fff" : "#8c8c8c",
                background: filterTag === tag ? "#4a5c6c" : "#f0f0f0",
                transition: "all 0.15s",
              }}
            >
              {tag}
            </span>
          ))}
          <div style={{ flex: 1, minWidth: 0 }} />
          <Input
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            placeholder="搜索搭配名称或衣物"
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 220, border: "1px solid #e8eaed", borderRadius: 4 }}
          />
        </div>
      )}

      {outfits.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#bfbfbf" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👔</div>
          <div>还没有搭配，点击右上角创建</div>
        </div>
      ) : filteredOutfits.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#bfbfbf" }}>
          <div style={{ fontSize: 13 }}>没有匹配的搭配</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredOutfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              itemMap={itemMap}
              extra={
                <div style={{ display: "flex", gap: 4 }}>
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(outfit)} />
                  <Button
                    size="small" type="text" danger icon={<DeleteOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: "删除这个搭配？", okText: "删除", okType: "danger", cancelText: "取消",
                        onOk: () => deleteMutation.mutate(outfit.id),
                      });
                    }}
                  />
                </div>
              }
            />
          ))}
        </div>
      )}

      {/* 创建/编辑弹窗 */}
      <Modal
        title={isEditing ? "编辑搭配" : "创建搭配"}
        open={createOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        width={560}
        confirmLoading={saving}
        okText={isEditing ? "保存" : "创建"}
      >
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="搭配名称，如：周末约会、通勤第一天"
            value={outfitName}
            onChange={(e) => setOutfitName(e.target.value)}
            maxLength={30}
          />
        </div>

        {/* 标签选择 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 6 }}>场景标签</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TAG_OPTIONS.map((tag) => {
              const active = outfitTags.includes(tag);
              return (
                <span
                  key={tag}
                  onClick={() => {
                    setOutfitTags((prev) =>
                      active ? prev.filter((t) => t !== tag) : [...prev, tag]
                    );
                  }}
                  style={{
                    fontSize: 12, cursor: "pointer",
                    padding: "4px 12px", borderRadius: 4,
                    color: active ? "#fff" : "#8c8c8c",
                    background: active ? "#4a5c6c" : "#f0f0f0",
                    transition: "all 0.15s",
                  }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 12 }}>
          选择衣物，位置根据品类自动填充，也可手动调整
        </div>

        <div style={{ maxHeight: 400, overflow: "auto" }}>
          {items.map((item) => {
            const sel = selected.find((s) => s.item_id === item.id);
            return (
              <div
                key={item.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0", borderBottom: "1px solid #f0f0f0",
                  background: sel ? "#fafbfc" : "transparent",
                  borderRadius: 4, paddingLeft: 8, paddingRight: 8,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: "pointer" }}
                  onClick={() => toggleItem(item.id)}
                >
                  <div style={{
                    width: 44, height: 56, background: "#f5f5f5", borderRadius: 4,
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                  }}>
                    {item.images.length > 0 ? (
                      <img src={getImageUrl(item.images[0])} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 16, opacity: 0.15 }}>👤</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name || item.sub_category}</div>
                    <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                      {CATEGORY_LABELS[item.category]} · {item.colors.slice(0, 2).join(" · ")}
                    </div>
                  </div>
                </div>
                {sel && (
                  <Select
                    size="small"
                    value={sel.position}
                    onChange={(pos) => {
                      setSelected((prev) =>
                        prev.map((s) => (s.item_id === item.id ? { ...s, position: pos } : s))
                      );
                    }}
                    onClick={(e) => e.stopPropagation()}
                    options={POSITION_OPTIONS}
                    style={{ width: 100, flexShrink: 0 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
