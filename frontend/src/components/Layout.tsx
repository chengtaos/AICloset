import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { colors, shadows, spacing, fontSize, fontWeight, transition } from "../styles/tokens";
import { Caption } from "./ui/Typography";

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/recommend": <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg>,
  "/outfits": <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  "/wardrobe": <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M12 9v12"/></svg>,
  "/settings": <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4m-14.2 0l1.4-1.4m11.4-11.4l1.4-1.4"/></svg>,
};

const NAV = [
  { path: "/recommend", label: "推荐" },
  { path: "/outfits", label: "搭配" },
  { path: "/wardrobe", label: "衣橱" },
  { path: "/settings", label: "设置" },
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
        {NAV.map(({ path, label }) => {
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
                opacity: active ? 1 : 0.5,
              }}
            >
              {NAV_ICONS[path]}
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
