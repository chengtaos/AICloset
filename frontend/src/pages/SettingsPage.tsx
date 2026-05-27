import { useState, useEffect, useCallback } from "react";
import { fetchApiKeys, updateApiKeys, type UserApiKeys } from "../api/client";
import { useResponsive } from "../hooks/useResponsive";

const FIELD_LABELS: Record<keyof UserApiKeys, string> = {
  deepseek: "DeepSeek API Key",
  amap: "高德地图 Web API Key",
  dashscope: "DashScope API Key（阿里云灵积）",
  alibaba_access_key_id: "阿里云 AccessKey ID",
  alibaba_access_key_secret: "阿里云 AccessKey Secret",
};

const FIELD_PLACEHOLDERS: Record<keyof UserApiKeys, string> = {
  deepseek: "sk-...",
  amap: "高德 Key，用于获取天气",
  dashscope: "sk-...，用于图片识别",
  alibaba_access_key_id: "用于服饰分割抠图",
  alibaba_access_key_secret: "AccessKey Secret",
};

const FIELD_KEYS: (keyof UserApiKeys)[] = [
  "deepseek",
  "amap",
  "dashscope",
  "alibaba_access_key_id",
  "alibaba_access_key_secret",
];

export default function SettingsPage() {
  const { isMobile } = useResponsive();
  const [keys, setKeys] = useState<UserApiKeys>({
    deepseek: "",
    amap: "",
    dashscope: "",
    alibaba_access_key_id: "",
    alibaba_access_key_secret: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchApiKeys();
        setKeys(data);
      } catch {
        // 加载失败静默处理
      }
    })();
  }, []);

  const handleChange = (field: keyof UserApiKeys, value: string) => {
    setKeys((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMsg(null);
    try {
      // 包含 **** 的字段表示未修改，发送空字符串让后端保留已有值
      const payload: UserApiKeys = { ...keys };
      for (const k of FIELD_KEYS) {
        if (payload[k].includes("****")) {
          payload[k] = "";
        }
      }
      const updated = await updateApiKeys(payload);
      setKeys(updated);
      setMsg({ type: "success", text: "保存成功" });
    } catch {
      setMsg({ type: "error", text: "保存失败，请重试" });
    } finally {
      setSaving(false);
    }
  }, [keys]);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 500, color: "#4a5c6c", margin: "0 0 8px" }}>
        API 密钥设置
      </h2>
      <p style={{ color: "#9aa5b0", fontSize: 13, margin: "0 0 24px", lineHeight: 1.6 }}>
        AiCloset 完全免费，AI 功能需要你提供自己的 API Key。
        <br />
        密钥加密存储在服务器，仅在你使用推荐/识别功能时按需调用。
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {FIELD_KEYS.map((field) => (
          <div key={field}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#4a5c6c",
                marginBottom: 6,
              }}
            >
              {FIELD_LABELS[field]}
            </label>
            <input
              type="password"
              placeholder={FIELD_PLACEHOLDERS[field]}
              value={keys[field]}
              onChange={(e) => handleChange(field, e.target.value)}
              style={inputStyle}
            />
          </div>
        ))}

        {msg && (
          <p
            style={{
              color: msg.type === "success" ? "#4a5c6c" : "#c44",
              fontSize: 13,
              margin: 0,
            }}
          >
            {msg.text}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: isMobile ? "100%" : undefined,
            height: 44,
            border: "none",
            borderRadius: 6,
            background: "#4a5c6c",
            color: "#fff",
            fontSize: 15,
            letterSpacing: "0.04em",
            cursor: "pointer",
            opacity: saving ? 0.6 : 1,
            marginTop: 8,
          }}
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 14px",
  border: "1px solid #dde1e6",
  borderRadius: 6,
  fontSize: 14,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};
