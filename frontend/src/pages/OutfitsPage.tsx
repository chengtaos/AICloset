import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Modal, Select, message, Input } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ClothingItem, OutfitItem } from "../types";
import { CATEGORY_LABELS } from "../types";
import { fetchItems, fetchOutfits, createOutfit, deleteOutfit } from "../api/client";
import OutfitCard from "../components/OutfitCard";

const POSITION_OPTIONS = [
  { value: "top", label: "上身" },
  { value: "bottom", label: "下身" },
  { value: "outer", label: "外套" },
  { value: "dress", label: "连衣裙" },
  { value: "shoes", label: "鞋子" },
  { value: "accessory", label: "配饰" },
];

export default function OutfitsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [outfitName, setOutfitName] = useState("");
  const [selected, setSelected] = useState<OutfitItem[]>([]);

  const { data: items = [] } = useQuery({ queryKey: ["items"], queryFn: () => fetchItems() });
  const { data: outfits = [] } = useQuery({ queryKey: ["outfits"], queryFn: fetchOutfits });

  const createMutation = useMutation({
    mutationFn: createOutfit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] });
      message.success("搭配已创建");
      setCreateOpen(false);
      setOutfitName("");
      setSelected([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOutfit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outfits"] });
      message.success("已删除");
    },
  });

  const itemMap = useMemo(() => {
    const map = new Map<number, ClothingItem>();
    items.forEach((it) => map.set(it.id, it));
    return map;
  }, [items]);

  const toggleItem = (itemId: number, position: string) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.item_id === itemId);
      if (exists) {
        return prev.filter((s) => s.item_id !== itemId);
      }
      return [...prev, { item_id: itemId, position }];
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>搭配</h2>
        <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          创建
        </Button>
      </div>

      {outfits.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#bfbfbf" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👔</div>
          <div>还没有搭配，点击右上角创建</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {outfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              itemMap={itemMap}
              extra={
                <Button size="small" type="text" danger icon={<DeleteOutlined />}
                  onClick={() => { Modal.confirm({ title: "删除这个搭配？", okText: "删除", okType: "danger", cancelText: "取消", onOk: () => deleteMutation.mutate(outfit.id) }); }} />
              }
            />
          ))}
        </div>
      )}

      {/* 创建搭配弹窗 */}
      <Modal
        title="创建搭配"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); setOutfitName(""); setSelected([]); }}
        onOk={() => {
          if (!outfitName.trim()) { message.warning("请输入搭配名称"); return; }
          if (selected.length === 0) { message.warning("请至少选择一件衣物"); return; }
          createMutation.mutate({ name: outfitName.trim(), items: selected, tags: [] });
        }}
        width={560}
        confirmLoading={createMutation.isPending}
      >
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="搭配名称，如：周末约会、通勤第一天"
            value={outfitName}
            onChange={(e) => setOutfitName(e.target.value)}
            maxLength={30}
          />
        </div>
        <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 12 }}>
          选择衣物，为每件指定穿搭位置
        </div>

        <div style={{ maxHeight: 400, overflow: "auto" }}>
          {items.map((item) => {
            const sel = selected.find((s) => s.item_id === item.id);
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0", borderBottom: "1px solid #f0f0f0",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44, height: 56, background: "#f5f5f5",
                    borderRadius: 4, display: "flex", alignItems: "center",
                    justifyContent: "center", overflow: "hidden",
                  }}>
                    {item.images.length > 0 ? (
                      <img src={`http://localhost:8000/${item.images[0]}`} alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 16, opacity: 0.15 }}>👤</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.sub_category}</div>
                    <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                      {CATEGORY_LABELS[item.category]} · {item.colors.slice(0, 2).join(" · ")}
                    </div>
                  </div>
                </div>
                <Select
                  placeholder="位置"
                  style={{ width: 90 }}
                  size="small"
                  value={sel?.position}
                  onChange={(pos) => toggleItem(item.id, pos)}
                  options={POSITION_OPTIONS}
                />
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
