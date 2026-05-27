import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login, register, loading, token } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  // 启动时等待 refresh token 校验
  if (loading && !token) {
    return <div style={{ minHeight: "100vh" }} />;
  }

  // 已登录直接跳转
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
      } else {
        await register(phone, password, nickname);
      }
      navigate("/recommend", { replace: true });
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
        background: "#f8f9fa",
        padding: 24,
      }}
    >
      <div style={{ width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 300,
              color: "#4a5c6c",
              letterSpacing: "0.04em",
              margin: 0,
            }}
          >
            AiCloset
          </h1>
          <p style={{ color: "#9aa5b0", fontSize: 14, marginTop: 8 }}>
            {mode === "login" ? "登录你的电子衣橱" : "创建你的电子衣橱"}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
            <p style={{ color: "#c44", fontSize: 13, margin: 0 }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              height: 44,
              border: "none",
              borderRadius: 6,
              background: "#4a5c6c",
              color: "#fff",
              fontSize: 15,
              letterSpacing: "0.04em",
              cursor: "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? "请稍候..."
              : mode === "login"
                ? "登录"
                : "注册"}
          </button>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 24,
            fontSize: 13,
            color: "#9aa5b0",
          }}
        >
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            onClick={toggleMode}
            style={{
              border: "none",
              background: "none",
              color: "#4a5c6c",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
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
  padding: "0 14px",
  border: "1px solid #dde1e6",
  borderRadius: 6,
  fontSize: 15,
  outline: "none",
  background: "#fff",
};
