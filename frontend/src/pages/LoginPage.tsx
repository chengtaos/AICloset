import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { colors, radii, spacing, fontSize, fontWeight } from "../styles/tokens";
import Card from "../components/ui/Card";
import { Title, Caption } from "../components/ui/Typography";
import Button from "../components/ui/Button";

export default function LoginPage() {
  const { login, register, loading, token } = useAuth();
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  if (loading && !token) {
    return <div style={{ minHeight: "100vh" }} />;
  }

  if (token) {
    return <Navigate to="/recommend" replace />;
  }

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError("");
  };

  const handleSubmit = async () => {
    setError("");
    if (!phone || phone.length < 11) {
      setError("请输入正确的手机号");
      return;
    }
    if (!password || password.length < 6) {
      setError("密码至少6位");
      return;
    }
    try {
      if (mode === "login") {
        await login(phone, password);
        navigate("/recommend", { replace: true });
      } else {
        await register(phone, password, nickname);
        navigate("/personality-test", { replace: true });
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "操作失败，请重试";
      setError(msg);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colors.bg,
        padding: spacing.xl,
      }}
    >
      <div style={{ width: isMobile ? "100%" : 360, maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1
            style={{
              fontSize: fontSize.display,
              fontWeight: fontWeight.regular,
              color: colors.accent,
              letterSpacing: "0.04em",
              margin: 0,
            }}
          >
            AiCloset
          </h1>
          <Caption style={{ marginTop: 8, display: "block" }}>
            {mode === "login" ? "登录你的电子衣橱" : "创建你的电子衣橱"}
          </Caption>
        </div>

        <Card variant="elevated" radius={radii.xl} padding={spacing.xxl}>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
            <input
              type="tel"
              placeholder="手机号"
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="密码（至少6位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />

            {mode === "register" && (
              <input
                type="text"
                placeholder="昵称（选填）"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                style={inputStyle}
              />
            )}

            {error && (
              <p style={{ color: colors.error, fontSize: fontSize.body, margin: 0 }}>{error}</p>
            )}

            <Button
              variant="primary"
              block
              size="lg"
              loading={loading}
              onClick={handleSubmit}
            >
              {loading ? "请稍候..." : mode === "login" ? "登录" : "注册"}
            </Button>
          </div>
        </Card>

        <p style={{ textAlign: "center", marginTop: spacing.xl, fontSize: fontSize.body, color: colors.textSecondary }}>
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            onClick={toggleMode}
            style={{
              border: "none",
              background: "none",
              color: colors.accent,
              cursor: "pointer",
              fontSize: fontSize.body,
              fontWeight: fontWeight.medium,
            }}
          >
            {mode === "login" ? "立即注册" : "去登录"}
          </button>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 44,
  width: "100%",
  padding: "0 14px",
  border: `1px solid ${colors.divider}`,
  borderRadius: radii.sm,
  fontSize: 15,
  outline: "none",
  background: colors.bg,
  fontFamily: "inherit",
  boxSizing: "border-box",
};
