import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal, Select, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { ClothingItem, Outfit, OutfitItem } from "../types";
import { CATEGORY_LABELS } from "../types";
import { createOutfit, deleteOutfit, fetchItems, fetchOutfits, updateOutfit } from "../api/client";
import { getImageUrl } from "../utils/imageUrl";
import { colors, radii, spacing, fontWeight } from "../styles/tokens";
import EmptyState from "../components/ui/EmptyState";
import OutfitCard from "../components/OutfitCard";
import Tag from "../components/ui/Tag";

const POSITION_OPTIONS = [
  { value: "upper", label: "上身" },
  { value: "lower", label: "下身" },
  { value: "outer", label: "外套" },
  { value: "dress", label: "连衣裙" },
  { value: "shoes", label: "鞋子" },
  { value: "side", label: "配饰/包" },
];

const TAG_OPTIONS = ["通勤", "约会", "聚会", "运动", "度假", "居家", "面试", "日常"];

function autoPosition(category: string): string {
  const map: Record<string, string> = {
    blouse: "upper",
    tshirt: "upper",
    hoodie: "upper",
    sweater: "upper",
    outer: "outer",
    pants: "lower",
    shorts: "lower",
    skirt: "lower",
    dress: "dress",
    shoes: "shoes",
    bag: "side",
    accessory: "side",
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
  const [searchText, setSearchText] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const { data: items = [] } = useQuery({ queryKey: ["items"], queryFn: () => fetchItems() });
  const { data: outfits = [] } = useQuery({ queryKey: ["outfits"], queryFn: fetchOutfits });
  const isEditing = editingId != null;

  const itemMap = useMemo(() => {
    const map = new Map<number, ClothingItem>();
    items.forEach((it) => map.set(it.id, it));
    return map;
  }, [items]);

  const filteredOutfits = useMemo(() => {
    let list = outfits;
    if (filterTag) list = list.filter((o) => o.tags.includes(filterTag));
    if (searchText) {
      const kw = searchText.toLowerCase();
      list = list.filter((o) =>
        o.name.toLowerCase().includes(kw) ||
        o.items.some((oi) => {
          const item = itemMap.get(oi.item_id);
          return item && ((item.name || "").toLowerCase().includes(kw) || item.sub_category.toLowerCase().includes(kw));
        }),
      );
    }
    return list;
  }, [outfits, filterTag, searchText, itemMap]);

  const closeModal = () => {
    setCreateOpen(false);
    setEditingId(null);
    setOutfitName("");
    setOutfitTags([]);
    setSelected([]);
  };

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

  const toggleItem = (itemId: number) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.item_id === itemId);
      if (exists) return prev.filter((s) => s.item_id !== itemId);
      const item = itemMap.get(itemId);
      return [...prev, { item_id: itemId, position: item ? autoPosition(item.category) : "upper" }];
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
    const payload = { name: outfitName.trim(), items: selected, tags: outfitTags };
    if (isEditing) updateMutation.mutate({ id: editingId!, data: payload });
    else createMutation.mutate(payload);
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="xhs-page">
      <div className="xhs-page-head">
        <div>
          <div className="xhs-kicker">搭配灵感</div>
          <h1 className="xhs-title">把衣服搭成好看的日常</h1>
          <div className="xhs-subtitle">用图片优先的方式收藏通勤、约会、旅行和居家穿搭。</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          创建搭配
        </Button>
      </div>

      {outfits.length > 0 && (
        <div className="xhs-toolbar" style={{ marginBottom: 22 }}>
          <div className="xhs-chip-row">
            {TAG_OPTIONS.map((tag) => (
              <Tag
                key={tag}
                variant="filled"
                active={filterTag === tag}
                size="md"
                onClick={() => setFilterTag((prev) => (prev === tag ? "" : tag))}
              >
                {tag}
              </Tag>
            ))}
          </div>
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索搭配名称或单品"
            allowClear
          />
        </div>
      )}

      {outfits.length === 0 ? (
        <EmptyState icon="搭" title="还没有搭配" description="创建第一篇穿搭笔记，让衣橱真正变成灵感库。" />
      ) : filteredOutfits.length === 0 ? (
        <EmptyState icon="搜" title="没有匹配的搭配" />
      ) : (
        <div className="xhs-feed">
          {filteredOutfits.map((outfit) => (
            <div className="xhs-feed-item" key={outfit.id}>
              <OutfitCard
                outfit={outfit}
                itemMap={itemMap}
                extra={
                  <div style={{ display: "flex", gap: 4 }}>
                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(outfit)} />
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        Modal.confirm({
                          title: "删除这个搭配？",
                          okText: "删除",
                          okType: "danger",
                          cancelText: "取消",
                          onOk: () => deleteMutation.mutate(outfit.id),
                        });
                      }}
                    />
                  </div>
                }
              />
            </div>
          ))}
        </div>
      )}

      <Modal
        title={isEditing ? "编辑搭配" : "创建搭配"}
        open={createOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        width={680}
        confirmLoading={saving}
        okText={isEditing ? "保存" : "创建"}
        cancelText="取消"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input
            placeholder="搭配名称，比如周末约会、通勤第一天"
            value={outfitName}
            onChange={(e) => setOutfitName(e.target.value)}
            maxLength={30}
          />

          <div>
            <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>场景标签</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TAG_OPTIONS.map((tag) => {
                const active = outfitTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => setOutfitTags((prev) => active ? prev.filter((t) => t !== tag) : [...prev, tag])}
                    style={{
                      border: "none",
                      borderRadius: radii.full,
                      color: active ? colors.surface : colors.textSecondary,
                      background: active ? colors.accent : colors.placeholder,
                      padding: "7px 13px",
                      fontWeight: active ? fontWeight.semibold : fontWeight.medium,
                      cursor: "pointer",
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ fontSize: 13, color: colors.textSecondary }}>
            选择衣物后会自动分配位置，也可以手动调整。
          </div>

          <div style={{ maxHeight: 420, overflow: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
            {items.map((item) => {
              const sel = selected.find((s) => s.item_id === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 10,
                    borderRadius: radii.lg,
                    background: sel ? colors.accentSoft : colors.placeholder,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ width: 52, height: 68, borderRadius: radii.md, overflow: "hidden", background: colors.surface, flexShrink: 0 }}>
                    {item.images.length > 0 && (
                      <img src={getImageUrl(item.images[0])} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name || item.sub_category}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textSecondary }}>
                      {CATEGORY_LABELS[item.category]} · {item.colors.slice(0, 2).join("、")}
                    </div>
                    {sel && (
                      <Select
                        size="small"
                        value={sel.position}
                        onChange={(pos) => setSelected((prev) => prev.map((s) => (s.item_id === item.id ? { ...s, position: pos } : s)))}
                        onClick={(e) => e.stopPropagation()}
                        options={POSITION_OPTIONS}
                        style={{ width: "100%", marginTop: 7 }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
