import { useEffect, useRef, useState } from "react";
import { Modal, Form, Input, Select, InputNumber, Upload, message } from "antd";
import { CameraOutlined, LoadingOutlined } from "@ant-design/icons";
import type { ClothingItem, ClothingItemCreate } from "../types";
import { CATEGORY_LABELS, SEASONS, STYLE_TAGS, SUB_CATEGORIES, COLORS_PRESET, MATERIALS } from "../types";
import { autoClassify } from "../api/client";

interface Props {
  open: boolean;
  editingItem?: ClothingItem | null;
  onClose: () => void;
  onSubmit: (values: ClothingItemCreate) => void;
}

export default function ItemForm({ open, editingItem, onClose, onSubmit }: Props) {
  const [form] = Form.useForm();
  const category = Form.useWatch("category", form);
  const [recognizing, setRecognizing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      editingItem ? form.setFieldsValue(editingItem) : form.resetFields();
    }
  }, [open, editingItem, form]);

  const handlePhotoRecognition = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRecognizing(true);
    try {
      const result = await autoClassify(file);
      form.setFieldsValue({
        category: result.category,
        sub_category: result.sub_category,
        colors: result.colors,
        style_tags: result.style_tags,
        seasons: result.seasons,
        material: result.material,
        temp_min: result.temp_min,
        temp_max: result.temp_max,
      });
      message.success(`识别完成：${result.sub_category} · ${result.colors.join("、")}`);
    } catch {
      message.error("识别失败，请确认图片清晰且包含单件衣物");
    } finally {
      setRecognizing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const subCategories = category ? SUB_CATEGORIES[category as string] || [] : [];

  return (
    <Modal
      title={editingItem ? "编辑衣物" : "录入衣物"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      width={560}
      destroyOnClose
    >
      {/* 拍照识别按钮 */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handlePhotoRecognition}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
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
        <span style={{ fontSize: 11, color: "#bfbfbf" }}>
          拍照自动识别品类、颜色、风格
        </span>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => { onSubmit(v as ClothingItemCreate); form.resetFields(); }}
        initialValues={{
          colors: [], material: [], seasons: [], style_tags: [],
          temp_min: 5, temp_max: 30, purchase_price: 0,
        }}
      >
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
    </Modal>
  );
}
