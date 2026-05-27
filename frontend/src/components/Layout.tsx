import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const NAV = [
  { path: "/recommend", label: "推荐", icon: "✨" },
  { path: "/outfits", label: "搭配", icon: "👔" },
  { path: "/wardrobe", label: "衣橱", icon: "🗂" },
  { path: "/stats", label: "统计", icon: "📊" },
  { path: "/settings", label: "设置", icon: "⚙" },
];

export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* 顶部栏 */}
      <header
        style={{
          height: 48,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #e8eaed",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <span style={{ fontSize: 13, color: "#6c7a89", fontWeight: 500 }}>
          {user?.nickname || "AiCloset"}
        </span>
        <button
          onClick={handleLogout}
          style={{
            border: "none",
            background: "none",
            color: "#9aa5b0",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          退出
        </button>
      </header>

      {/* 内容区 */}
      <main style={{ paddingBottom: 72, maxWidth: 860, margin: "0 auto", padding: "32px 24px 88px" }}>
        <Outlet />
      </main>

      {/* 底部导航 */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 56,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          borderTop: "1px solid #e8eaed",
          display: "flex",
          justifyContent: "center",
          gap: 0,
          zIndex: 100,
        }}
      >
        {NAV.map(({ path, label, icon }) => {
          const active = pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                flex: 1,
                maxWidth: 120,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: active ? "#4a5c6c" : "#8c8c8c",
                fontSize: 11,
                fontWeight: active ? 600 : 400,
                letterSpacing: "0.02em",
                transition: "color 0.15s",
                padding: 0,
              }}
            >
              <span style={{ fontSize: 18, opacity: active ? 1 : 0.5 }}>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
