import { useEffect, useRef, useState } from "react";
import { Modal, Form, Input, Select, InputNumber, message } from "antd";
// InputNumber used in BatchItemCard above
import { CameraOutlined, PictureOutlined, LoadingOutlined, CloseOutlined } from "@ant-design/icons";
import type { ClothingItem, ClothingItemCreate } from "../types";
import { CATEGORY_LABELS, SEASONS, STYLE_TAGS, SUB_CATEGORIES, COLORS_PRESET, MATERIALS } from "../types";
import { autoClassify } from "../api/client";
import { getImageUrl } from "../utils/imageUrl";

/** 批量识别中的单件衣物卡片：支持展开编辑 */
function BatchItemCard({
  item, index, onUpdate, onRemove,
}: {
  item: ClothingItemCreate;
  index: number;
  onUpdate: (item: ClothingItemCreate) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const catLabel = CATEGORY_LABELS[item.category] || item.category;
  const subCats = SUB_CATEGORIES[item.category] || [];

  return (
    <div style={{
      border: "1px solid #f0f0f0", borderRadius: 6, marginBottom: 8,
      background: "#fafafa", overflow: "hidden",
    }}>
      {/* 折叠头部：缩略图 + 摘要 + 操作按钮 */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 12px", cursor: "pointer",
        }}
      >
        <div style={{
          width: 44, height: 56, borderRadius: 4,
          background: "#f0f0f0", overflow: "hidden", flexShrink: 0,
        }}>
          {item.image_path ? (
            <img src={getImageUrl(item.image_path)} alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 18, opacity: 0.15 }}>👤</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {catLabel} · {item.sub_category}
          </div>
          <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 2 }}>
            {(item.colors || []).join(" · ") || "未设颜色"}
            {(item.style_tags || []).length > 0 && ` · ${(item.style_tags || []).slice(0, 2).join(" · ")}`}
            {` · ${(item.seasons || []).join("·") || "未设季节"}`}
          </div>
        </div>
        <span style={{ fontSize: 11, color: "#bbb", flexShrink: 0 }}>
          {expanded ? "收起 ▲" : "编辑 ▼"}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            width: 22, height: 22, flexShrink: 0,
            border: "none", borderRadius: 4,
            background: "rgba(0,0,0,0.06)", color: "#999",
            cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 12,
          }}
        >
          <CloseOutlined />
        </button>
      </div>

      {/* 展开编辑区 */}
      {expanded && (
        <div style={{ padding: "8px 12px 14px", borderTop: "1px solid #f0f0f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {/* 品类 */}
            <div>
              <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 2 }}>品类</div>
              <Select
                size="small"
                value={item.category}
                onChange={(v) => onUpdate({ ...item, category: v, sub_category: (SUB_CATEGORIES[v] || [])[0] || "" })}
                options={Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                style={{ width: "100%" }}
              />
            </div>
            {/* 子品类 */}
            <div>
              <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 2 }}>子品类</div>
              <Select
                size="small"
                value={item.sub_category}
                onChange={(v) => onUpdate({ ...item, sub_category: v })}
                options={subCats.map((s) => ({ value: s, label: s }))}
                style={{ width: "100%" }}
                showSearch
              />
            </div>
          </div>

          {/* 颜色 */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 2 }}>颜色</div>
            <Select
              size="small" mode="multiple"
              value={item.colors || []}
              onChange={(v) => onUpdate({ ...item, colors: v })}
              options={COLORS_PRESET.map((c) => ({ value: c, label: c }))}
              style={{ width: "100%" }}
              maxTagCount={4}
            />
          </div>

          {/* 风格 + 季节 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 2 }}>风格</div>
              <Select
                size="small" mode="multiple"
                value={item.style_tags || []}
                onChange={(v) => onUpdate({ ...item, style_tags: v })}
                options={STYLE_TAGS.map((s) => ({ value: s, label: s }))}
                style={{ width: "100%" }}
                maxTagCount={2}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 2 }}>季节</div>
              <Select
                size="small" mode="multiple"
                value={item.seasons || []}
                onChange={(v) => onUpdate({ ...item, seasons: v })}
                options={SEASONS.map((s) => ({ value: s, label: s }))}
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* 材质 + 温度 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 2 }}>材质</div>
              <Select
                size="small" mode="multiple"
                value={item.material || []}
                onChange={(v) => onUpdate({ ...item, material: v })}
                options={MATERIALS.map((m) => ({ value: m, label: m }))}
                style={{ width: "100%" }}
                maxTagCount={2}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 2 }}>温度范围 °C</div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <InputNumber
                  size="small" min={-20} max={45}
                  value={item.temp_min}
                  onChange={(v) => onUpdate({ ...item, temp_min: v ?? 5 })}
                  style={{ width: "100%" }}
                />
                <span style={{ color: "#ccc" }}>~</span>
                <InputNumber
                  size="small" min={-5} max={50}
                  value={item.temp_max}
                  onChange={(v) => onUpdate({ ...item, temp_max: v ?? 30 })}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>

          {/* 品牌 + 价格 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 2 }}>品牌</div>
              <Input
                size="small"
                value={item.brand || ""}
                onChange={(e) => onUpdate({ ...item, brand: e.target.value })}
                placeholder="Uniqlo"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 2 }}>购入价格</div>
              <InputNumber
                size="small" min={0} prefix="¥"
                value={item.purchase_price ?? 0}
                onChange={(v) => onUpdate({ ...item, purchase_price: v ?? 0 })}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  editingItem?: ClothingItem | null;
  onClose: () => void;
  onSubmit: (values: ClothingItemCreate, imageFile?: File) => void;
  onBatchSubmit?: (items: ClothingItemCreate[], imageFile: File) => void;
}

export default function ItemForm({ open, editingItem, onClose, onSubmit, onBatchSubmit }: Props) {
  const [form] = Form.useForm();
  const category = Form.useWatch("category", form);
  const [recognizing, setRecognizing] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [batchItems, setBatchItems] = useState<ClothingItemCreate[]>([]);
  const imagePathRef = useRef<string | null>(null);
  const imageFileRef = useRef<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const isBatch = batchItems.length > 0;

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.setFieldsValue(editingItem);
        setHasPhoto(editingItem.images.length > 0);
      } else {
        form.resetFields();
        setHasPhoto(false);
      }
      imagePathRef.current = null;
      imageFileRef.current = null;
      setBatchItems([]);
    }
  }, [open, editingItem, form]);

  const processPhoto = async (file: File) => {
    setRecognizing(true);
    imageFileRef.current = file;
    try {
      const result = await autoClassify(file);
      if (result.items.length === 0) {
        message.warning("未识别到衣物，请重试");
      } else if (result.items.length === 1) {
        // 单件：填入表单
        const item = result.items[0];
        imagePathRef.current = item.image_path || null;
        form.setFieldsValue({
          category: item.category,
          sub_category: item.sub_category,
          colors: item.colors,
          style_tags: item.style_tags,
          seasons: item.seasons,
          material: item.material,
          temp_min: item.temp_min,
          temp_max: item.temp_max,
        });
        setHasPhoto(true);
        message.success(`识别完成：${item.sub_category} · ${(item.colors || []).join("、")}`);
      } else {
        // 多件：进入批量模式
        setBatchItems(result.items);
        setHasPhoto(true);
        message.success(`识别到 ${result.items.length} 件衣物，确认后录入`);
      }
    } catch {
      imagePathRef.current = null;
      setHasPhoto(true);
      message.error("识别失败，请手动填写字段");
    } finally {
      setRecognizing(false);
    }
  };

  const handleCamera = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processPhoto(file);
  };

  const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    imageFileRef.current = file;
    imagePathRef.current = null;
    setBatchItems([]);
    setHasPhoto(true);
  };

  const handleRemoveBatchItem = (idx: number) => {
    setBatchItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    const values = form.getFieldsValue() as ClothingItemCreate;
    if (imagePathRef.current) {
      values.image_path = imagePathRef.current;
    }
    onSubmit(values, imageFileRef.current || undefined);
    form.resetFields();
  };

  const handleBatchConfirm = () => {
    if (onBatchSubmit && imageFileRef.current) {
      onBatchSubmit(batchItems, imageFileRef.current);
      setBatchItems([]);
      imageFileRef.current = null;
      message.success(`已录入 ${batchItems.length} 件`);
    }
  };

  const subCategories = category ? SUB_CATEGORIES[category as string] || [] : [];

  return (
    <Modal
      title={
        isBatch
          ? `识别到 ${batchItems.length} 件衣物`
          : editingItem
            ? "编辑衣物"
            : "录入衣物"
      }
      open={open}
      onCancel={() => { onClose(); setBatchItems([]); }}
      onOk={isBatch ? handleBatchConfirm : () => form.submit()}
      okText={isBatch ? `确认录入 ${batchItems.length} 件` : editingItem ? "保存" : "录入"}
      width={560}
      destroyOnClose
      okButtonProps={{ disabled: isBatch && batchItems.length === 0 }}
    >
      {/* 图片预览：单件模式下展示分割后的抠图 */}
      {!isBatch && hasPhoto && (
        <div style={{
          width: "100%", height: 200, background: "#fafafa",
          borderRadius: 8, marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", border: "1px solid #eee",
        }}>
          {imagePathRef.current ? (
            <img
              src={getImageUrl(imagePathRef.current)}
              alt="预览"
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: 13, color: "#ccc" }}>已选择图片，填写下方字段后录入</span>
          )}
        </div>
      )}

      {/* 拍照识别 / 相册选择 */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleCamera}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleGalleryPick}
        />
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={recognizing}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            border: "1px solid #e8eaed", borderRadius: 4,
            background: "#fff", padding: "8px 16px",
            cursor: recognizing ? "not-allowed" : "pointer",
            fontSize: 13, color: "#4a5c6c", fontWeight: 500,
          }}
        >
          {recognizing ? (
            <LoadingOutlined style={{ fontSize: 16 }} />
          ) : (
            <CameraOutlined style={{ fontSize: 16 }} />
          )}
          {recognizing ? "AI 识别中…" : "拍照识别"}
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={recognizing}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            border: "1px solid #e8eaed", borderRadius: 4,
            background: "#fff", padding: "8px 16px",
            cursor: recognizing ? "not-allowed" : "pointer",
            fontSize: 13, color: "#8c8c8c", fontWeight: 500,
          }}
        >
          <PictureOutlined style={{ fontSize: 16 }} />
          相册
        </button>
        <span style={{ fontSize: 11, color: hasPhoto ? "#4a5c6c" : "#bfbfbf" }}>
          {isBatch ? "批量识别模式" : hasPhoto ? "已选择图片" : "拍照自动识别，或从相册选择"}
        </span>
      </div>

      {/* 批量识别结果：支持逐件编辑 */}
      {isBatch ? (
        <div style={{ maxHeight: 460, overflow: "auto" }}>
          <div style={{ fontSize: 12, color: "#999", marginBottom: 10 }}>
            识别到 {batchItems.length} 件，点击展开可编辑品类、颜色等信息，不需要的可删除
          </div>
          {batchItems.map((item, idx) => (
            <BatchItemCard
              key={idx}
              item={item}
              index={idx}
              onUpdate={(updated) => {
                setBatchItems((prev) => prev.map((it, i) => (i === idx ? updated : it)));
              }}
              onRemove={() => handleRemoveBatchItem(idx)}
            />
          ))}
        </div>
      ) : (
        /* 单件表单（原有流程） */
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            name: "", colors: [], material: [], seasons: [], style_tags: [],
            temp_min: 5, temp_max: 30, purchase_price: 0,
          }}
        >
          <Form.Item name="name" label="名称（选填）">
            <Input placeholder="如：优衣库白T、黑色通勤长裤" maxLength={30} />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item name="category" label="品类" rules={[{ required: true }]}>
              <Select options={Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
            </Form.Item>
            <Form.Item name="sub_category" label="子品类" rules={[{ required: true }]}>
              <Select options={subCategories.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
          </div>

          <Form.Item name="colors" label="颜色">
            <Select mode="multiple" options={COLORS_PRESET.map((c) => ({ value: c, label: c }))} />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item name="brand" label="品牌">
              <Input placeholder="Uniqlo" />
            </Form.Item>
            <Form.Item name="purchase_price" label="购入价格">
              <InputNumber prefix="¥" min={0} style={{ width: "100%" }} />
            </Form.Item>
          </div>

          <Form.Item name="seasons" label="季节">
            <Select mode="multiple" options={SEASONS.map((s) => ({ value: s, label: s }))} />
          </Form.Item>

          <Form.Item name="style_tags" label="风格">
            <Select mode="multiple" options={STYLE_TAGS.map((s) => ({ value: s, label: s }))} />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item name="temp_min" label="最低适用温度 °C">
              <InputNumber min={-20} max={45} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="temp_max" label="最高适用温度 °C">
              <InputNumber min={-5} max={50} style={{ width: "100%" }} />
            </Form.Item>
          </div>

          <Form.Item name="material" label="材质">
            <Select mode="multiple" options={MATERIALS.map((m) => ({ value: m, label: m }))} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
