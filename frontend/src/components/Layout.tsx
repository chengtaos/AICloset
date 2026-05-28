import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { colors, shadows, spacing, fontSize, fontWeight, transition } from "../styles/tokens";
import { Caption } from "./ui/Typography";

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
  const { isMobile } = useResponsive();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg }}>
      {/* 顶部栏 — 毛玻璃 */}
      <header
        style={{
          height: isMobile ? 44 : 48,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: shadows.header,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "0 16px" : "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Caption style={{ color: colors.textSecondary }}>
          {user?.nickname || "AiCloset"}
        </Caption>
        <button
          onClick={handleLogout}
          style={{
            border: "none",
            background: "none",
            color: colors.textTertiary,
            fontSize: fontSize.caption,
            cursor: "pointer",
          }}
        >
          退出
        </button>
      </header>

      {/* 内容区 */}
      <main style={{
        paddingBottom: 72,
        maxWidth: 860,
        margin: "0 auto",
        padding: isMobile ? `${spacing.lg}px ${spacing.sm}px 80px` : `${spacing.xxl}px ${spacing.xl}px 88px`,
      }}>
        <Outlet />
      </main>

      {/* 底部导航 — 毛玻璃 */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: isMobile ? 52 : 56,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: shadows.nav,
          display: "flex",
          justifyContent: "center",
          gap: 0,
          zIndex: 100,
          paddingBottom: isMobile ? "env(safe-area-inset-bottom, 0px)" : 0,
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
                maxWidth: isMobile ? 72 : 120,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: isMobile ? 0 : 2,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: active ? colors.accent : colors.textSecondary,
                fontSize: isMobile ? 10 : 11,
                fontWeight: active ? fontWeight.semibold : fontWeight.regular,
                letterSpacing: "0.02em",
                transition: transition.fast,
                padding: 0,
              }}
            >
              <span style={{ fontSize: isMobile ? 16 : 18, opacity: active ? 1 : 0.45 }}>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
