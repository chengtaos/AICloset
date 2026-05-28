import { useState, useEffect, useCallback } from "react";
import { fetchApiKeys, updateApiKeys, type UserApiKeys } from "../api/client";
import { fetchProfile, updateProfile, changePassword, uploadAvatar, type UserProfile } from "../api/client";
import { getImageUrl } from "../utils/imageUrl";
import { useResponsive } from "../hooks/useResponsive";
import { colors, radii } from "../styles/tokens";
import { Title } from "../components/ui/Typography";
import Tag from "../components/ui/Tag";
import UIButton from "../components/ui/Button";
import { useAuth } from "../contexts/AuthContext";

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
  "deepseek", "amap", "dashscope",
  "alibaba_access_key_id", "alibaba_access_key_secret",
];

type Section = "profile" | "password" | "keys";

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { isMobile } = useResponsive();

  // 当前展开区域
  const [section, setSection] = useState<Section>("profile");

  // ── 个人资料 ──
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // ── 密码 ──
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── API Keys ──
  const [keys, setKeys] = useState<UserApiKeys>({
    deepseek: "", amap: "", dashscope: "",
    alibaba_access_key_id: "", alibaba_access_key_secret: "",
  });
  const [keysSaving, setKeysSaving] = useState(false);
  const [keysMsg, setKeysMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try { const data = await fetchProfile(); setAvatarUrl(data.avatar); } catch {}
    })();
  }, []);

  useEffect(() => {
    if (section === "keys") {
      (async () => {
        try { const data = await fetchApiKeys(); setKeys(data); } catch {}
      })();
    }
  }, [section]);

  const handleSaveProfile = useCallback(async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateProfile({ nickname });
      setProfileMsg({ type: "success", text: "保存成功" });
      if (user) setUser({ ...user, nickname });
    } catch {
      setProfileMsg({ type: "error", text: "保存失败" });
    } finally {
      setProfileSaving(false);
    }
  }, [nickname, setUser, user]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const updated = await uploadAvatar(file);
      setAvatarUrl(updated.avatar);
      if (user) setUser({ ...user, avatar: updated.avatar });
    } catch {
      // ignore
    } finally {
      setAvatarUploading(false);
    }
  }, [setUser, user]);

  const handleChangePassword = useCallback(async () => {
    if (!oldPwd || !newPwd) return;
    if (newPwd.length < 6) { setPwdMsg({ type: "error", text: "新密码至少6位" }); return; }
    setPwdSaving(true);
    setPwdMsg(null);
    try {
      await changePassword({ old_password: oldPwd, new_password: newPwd });
      setPwdMsg({ type: "success", text: "密码已修改，请重新登录" });
      setOldPwd(""); setNewPwd("");
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPwdMsg({ type: "error", text: detail || "修改失败" });
    } finally {
      setPwdSaving(false);
    }
  }, [oldPwd, newPwd]);

  const handleSaveKeys = useCallback(async () => {
    setKeysSaving(true);
    setKeysMsg(null);
    try {
      const payload: UserApiKeys = { ...keys };
      for (const k of FIELD_KEYS) {
        if (payload[k].includes("****")) payload[k] = "";
      }
      const updated = await updateApiKeys(payload);
      setKeys(updated);
      setKeysMsg({ type: "success", text: "保存成功" });
    } catch {
      setKeysMsg({ type: "error", text: "保存失败，请重试" });
    } finally {
      setKeysSaving(false);
    }
  }, [keys]);

  return (
    <div>
      <Title style={{ marginBottom: 20 }}>设置</Title>

      {/* 子导航 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
        <Tag variant="filled" active={section === "profile"} size="md" onClick={() => setSection("profile")}>个人资料</Tag>
        <Tag variant="filled" active={section === "password"} size="md" onClick={() => setSection("password")}>修改密码</Tag>
        <Tag variant="filled" active={section === "keys"} size="md" onClick={() => setSection("keys")}>API 密钥</Tag>
      </div>

      {/* ── 个人资料 ── */}
      {section === "profile" && (
        <div style={{ maxWidth: 400 }}>
          {/* 头像 */}
          <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", overflow: "hidden",
              background: colors.placeholder, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {avatarUrl ? (
                <img src={getImageUrl(avatarUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 24, opacity: 0.2 }}>👤</span>
              )}
            </div>
            <label style={{
              fontSize: 12, color: colors.accent, cursor: "pointer",
              border: `1px solid ${colors.divider}`, borderRadius: radii.sm, padding: "6px 14px",
            }}>
              {avatarUploading ? "上传中..." : "更换头像"}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
            </label>
          </div>

          {/* 昵称 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: colors.accent, marginBottom: 6 }}>昵称</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入昵称"
              maxLength={20}
              style={inputStyle}
            />
          </div>

          {profileMsg && (
            <p style={{ color: profileMsg.type === "success" ? colors.accent : colors.error, fontSize: 13 }}>{profileMsg.text}</p>
          )}

          <UIButton variant="primary" size="lg" loading={profileSaving} onClick={handleSaveProfile} style={{ letterSpacing: "0.04em" }}>
            保存
          </UIButton>
        </div>
      )}

      {/* ── 修改密码 ── */}
      {section === "password" && (
        <div style={{ maxWidth: 400 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: colors.accent, marginBottom: 6 }}>旧密码</label>
            <input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: colors.accent, marginBottom: 6 }}>新密码（至少6位）</label>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={inputStyle} />
          </div>

          {pwdMsg && (
            <p style={{ color: pwdMsg.type === "success" ? colors.accent : colors.error, fontSize: 13 }}>{pwdMsg.text}</p>
          )}

          <UIButton variant="primary" size="lg" loading={pwdSaving} disabled={!oldPwd || !newPwd} onClick={handleChangePassword} style={{ letterSpacing: "0.04em" }}>
            修改密码
          </UIButton>
        </div>
      )}

      {/* ── API 密钥 ── */}
      {section === "keys" && (
        <div style={{ maxWidth: 400 }}>
          <p style={{ color: colors.textSecondary, fontSize: 13, margin: "0 0 24px", lineHeight: 1.6 }}>
            AiCloset 完全免费，AI 功能需要你提供自己的 API Key。密钥加密存储，仅在按需调用时解密使用。
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {FIELD_KEYS.map((field) => (
              <div key={field}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: colors.accent, marginBottom: 6 }}>{FIELD_LABELS[field]}</label>
                <input
                  type="password"
                  placeholder={FIELD_PLACEHOLDERS[field]}
                  value={keys[field]}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [field]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}

            {keysMsg && (
              <p style={{ color: keysMsg.type === "success" ? colors.accent : colors.error, fontSize: 13, margin: 0 }}>{keysMsg.text}</p>
            )}

            <UIButton variant="primary" size="lg" loading={keysSaving} onClick={handleSaveKeys} block={isMobile} style={{ letterSpacing: "0.04em" }}>
              保存
            </UIButton>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 14px",
  border: `1px solid ${colors.divider}`, borderRadius: radii.md,
  fontSize: 14, outline: "none", background: colors.surface, boxSizing: "border-box",
};
