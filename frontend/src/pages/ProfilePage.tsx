import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchStats, fetchProfile, updateProfile, changePassword,
  uploadAvatar, fetchApiKeys, updateApiKeys, type UserApiKeys,
} from "../api/client";
import { getImageUrl } from "../utils/imageUrl";
import { useResponsive } from "../hooks/useResponsive";
import { colors, radii, spacing, fontSize, fontWeight, shadows } from "../styles/tokens";
import { Title, SectionTitle, Caption, Body } from "../components/ui/Typography";
import Card from "../components/ui/Card";
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

type View = "menu" | "profile" | "password" | "keys" | "about";

const ease = "cubic-bezier(0.4, 0, 0.2, 1)";

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "14px 0",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 14,
  color: colors.textPrimary,
  transition: `background 0.15s ${ease}`,
};

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 14px",
  border: `1px solid ${colors.divider}`, borderRadius: radii.md,
  fontSize: 14, outline: "none", background: colors.surface, boxSizing: "border-box",
};

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [view, setView] = useState<View>("menu");

  // 画像数据
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: fetchStats });

  // ── profile form state ──
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // ── password form state ──
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── keys form state ──
  const [keys, setKeys] = useState<UserApiKeys>({
    deepseek: "", amap: "", dashscope: "",
    alibaba_access_key_id: "", alibaba_access_key_secret: "",
  });
  const [keysSaving, setKeysSaving] = useState(false);
  const [keysMsg, setKeysMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 加载头像
  useEffect(() => {
    (async () => {
      try { const data = await fetchProfile(); setAvatarUrl(data.avatar); } catch {}
    })();
  }, []);

  // 进入 keys 面板时加载已有 keys
  useEffect(() => {
    if (view === "keys") {
      (async () => {
        try { const data = await fetchApiKeys(); setKeys(data); } catch {}
      })();
    }
  }, [view]);

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
    } catch {} finally {
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

  // 手机号脱敏
  const maskedPhone = user?.phone
    ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}`
    : "";

  // ── 子面板返回栏 ──
  const backBar = (title: string) => (
    <button
      onClick={() => setView("menu")}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        border: "none", background: "transparent",
        cursor: "pointer", padding: 0, marginBottom: 24,
        color: colors.textSecondary, fontSize: 13,
        transition: `color 0.15s ${ease}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = colors.accent; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = colors.textSecondary; }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {title}
    </button>
  );

  return (
    <div>
      <Title style={{ marginBottom: 24 }}>我的</Title>

      {view === "menu" && (
        <>
          {/* 个人画像卡片 */}
          <Card variant="elevated" padding={isMobile ? 20 : 28} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* 头像 */}
              <div
                style={{
                  width: 64, height: 64, borderRadius: "50%",
                  overflow: "hidden", flexShrink: 0,
                  background: colors.placeholder,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {(avatarUrl || user?.avatar) ? (
                  <img
                    src={getImageUrl(avatarUrl || user?.avatar || "")}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 26, color: colors.accent, fontWeight: 600, opacity: 0.5 }}>
                    {(user?.nickname || "A")[0]}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary, marginBottom: 4 }}>
                  {user?.nickname || "用户"}
                </div>
                <div style={{ fontSize: 13, color: colors.textSecondary }}>
                  {maskedPhone}
                </div>
              </div>
            </div>

            {/* 统计数字 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                marginTop: 20,
                paddingTop: 16,
                borderTop: `1px solid ${colors.divider}`,
              }}
            >
              {[
                { label: "衣物", value: stats ? `${stats.total_items}` : "—" },
                { label: "价值", value: stats ? `¥${Math.round(stats.total_value / 1000)}k` : "—" },
                { label: "沉睡", value: stats ? `${stats.sleeping_items.length} 件` : "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary }}>{value}</div>
                  <Caption style={{ marginTop: 2 }}>{label}</Caption>
                </div>
              ))}
            </div>
          </Card>

          {/* 菜单列表 */}
          <Card padding="0 20px" style={{ marginBottom: 24 }}>
            {[
              { key: "profile", label: "编辑资料", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              )},
              { key: "password", label: "修改密码", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              )},
              { key: "keys", label: "API 密钥", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
              )},
              { key: "about", label: "关于", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              )},
            ].map((item, i, arr) => (
              <button
                key={item.key}
                onClick={() => setView(item.key as View)}
                style={{
                  ...menuItemStyle,
                  borderBottom: i < arr.length - 1 ? `1px solid ${colors.divider}` : "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.accentSoft;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 12, color: colors.textSecondary }}>
                  {item.icon}
                  {item.label}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))}
          </Card>

          {/* 退出登录 */}
          <UIButton
            variant="ghost"
            block
            size="lg"
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            style={{ color: colors.textSecondary }}
          >
            退出登录
          </UIButton>
        </>
      )}

      {/* ── 编辑资料 ── */}
      {view === "profile" && (
        <div style={{ maxWidth: 400 }}>
          {backBar("编辑资料")}
          <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", overflow: "hidden",
              background: colors.placeholder, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {(avatarUrl || user?.avatar) ? (
                <img src={getImageUrl(avatarUrl || user?.avatar || "")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: colors.accent, marginBottom: 6 }}>昵称</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="输入昵称" maxLength={20} style={inputStyle} />
          </div>

          {profileMsg && (
            <p style={{ color: profileMsg.type === "success" ? colors.accent : colors.error, fontSize: 13 }}>{profileMsg.text}</p>
          )}

          <UIButton variant="primary" size="lg" loading={profileSaving} onClick={handleSaveProfile}>
            保存
          </UIButton>
        </div>
      )}

      {/* ── 修改密码 ── */}
      {view === "password" && (
        <div style={{ maxWidth: 400 }}>
          {backBar("修改密码")}
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

          <UIButton variant="primary" size="lg" loading={pwdSaving} disabled={!oldPwd || !newPwd} onClick={handleChangePassword}>
            修改密码
          </UIButton>
        </div>
      )}

      {/* ── API 密钥 ── */}
      {view === "keys" && (
        <div style={{ maxWidth: 400 }}>
          {backBar("API 密钥")}
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

            <UIButton variant="primary" size="lg" loading={keysSaving} onClick={handleSaveKeys}>
              保存
            </UIButton>
          </div>
        </div>
      )}

      {/* ── 关于 ── */}
      {view === "about" && (
        <div style={{ maxWidth: 400 }}>
          {backBar("关于")}
          <Card padding={20}>
            <div style={{ fontSize: 14, color: colors.textPrimary, lineHeight: 2 }}>
              <div>AiCloset · 智能电子衣橱</div>
              <div style={{ color: colors.textSecondary, fontSize: 13 }}>
                版本 1.0.0（MVP）
              </div>
              <div style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>
                数字化管理衣物，AI 驱动的穿搭推荐。
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
