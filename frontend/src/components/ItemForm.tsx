import { useEffect, useRef, useState } from "react";
import { Modal, Form, Input, Select, InputNumber, message } from "antd";
import { CameraOutlined, PictureOutlined, LoadingOutlined } from "@ant-design/icons";
import type { ClothingItem, ClothingItemCreate } from "../types";
import { CATEGORY_LABELS, SEASONS, STYLE_TAGS, SUB_CATEGORIES, COLORS_PRESET, MATERIALS } from "../types";
import { autoClassify } from "../api/client";

interface Props {
  open: boolean;
  editingItem?: ClothingItem | null;
  onClose: () => void;
  onSubmit: (values: ClothingItemCreate, imageFile?: File) => void;
}

export default function ItemForm({ open, editingItem, onClose, onSubmit }: Props) {
  const [form] = Form.useForm();
  const category = Form.useWatch("category", form);
  const [recognizing, setRecognizing] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const imagePathRef = useRef<string | null>(null);
  const imageFileRef = useRef<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

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
    }
  }, [open, editingItem, form]);

  const processPhoto = async (file: File) => {
    setRecognizing(true);
    imageFileRef.current = file;
    try {
      const result = await autoClassify(file);
      imagePathRef.current = result.image_path;
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
      setHasPhoto(true);
      message.success(`识别完成：${result.sub_category} · ${result.colors.join("、")}`);
    } catch {
      imagePathRef.current = null;
      setHasPhoto(true); // 识别失败但图片仍保留
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
    setHasPhoto(true);
  };

  const handleSubmit = () => {
    const values = form.getFieldsValue() as ClothingItemCreate;
    if (imagePathRef.current) {
      values.image_path = imagePathRef.current;
    }
    onSubmit(values, imageFileRef.current || undefined);
    form.resetFields();
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
          {hasPhoto ? "已选择图片" : "拍照自动识别，或从相册选择"}
        </span>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
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
