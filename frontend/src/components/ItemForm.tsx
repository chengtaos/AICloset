import { useEffect } from "react";
import { Modal, Form, Input, Select, InputNumber } from "antd";
import type { ClothingItem, ClothingItemCreate } from "../types";
import { CATEGORY_LABELS, SEASONS, STYLE_TAGS, SUB_CATEGORIES } from "../types";

interface Props {
  open: boolean;
  editingItem?: ClothingItem | null;
  onClose: () => void;
  onSubmit: (values: ClothingItemCreate) => void;
}

const COLORS_PRESET = [
  "白色", "黑色", "灰色", "蓝色", "藏青", "卡其色", "棕色", "米色",
  "红色", "粉色", "绿色", "牛仔蓝", "条纹", "格纹",
];

export default function ItemForm({ open, editingItem, onClose, onSubmit }: Props) {
  const [form] = Form.useForm();
  const category = Form.useWatch("category", form);

  useEffect(() => {
    if (open) {
      editingItem ? form.setFieldsValue(editingItem) : form.resetFields();
    }
  }, [open, editingItem, form]);

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
          <Select mode="multiple" options={
            ["棉", "麻", "羊毛", "羊绒", "真丝", "涤纶", "牛仔", "皮革", "羽绒", "棉麻", "雪纺"]
              .map((m) => ({ value: m, label: m }))
          } />
        </Form.Item>
      </Form>
    </Modal>
  );
}
