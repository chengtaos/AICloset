import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  AppstoreOutlined,
  BgColorsOutlined,
  HeartOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { colors, shadows, spacing, fontSize, fontWeight, transition, radii } from "../styles/tokens";

const NAV = [
  { path: "/recommend", label: "灵感", icon: <HeartOutlined /> },
  { path: "/outfits", label: "搭配", icon: <BgColorsOutlined /> },
  { path: "/wardrobe", label: "衣橱", icon: <AppstoreOutlined /> },
  { path: "/profile", label: "我的", icon: <UserOutlined /> },
];

export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (isTablet || isDesktop) {
    const sidebarW = isDesktop ? 236 : 78;
    const compact = isTablet;

    return (
      <div style={{ minHeight: "100dvh", background: colors.bg, display: "flex" }}>
        <aside
          style={{
            position: "fixed",
            inset: "18px auto 18px 18px",
            width: sidebarW,
            background: "rgba(255,255,255,0.86)",
            border: `1px solid ${colors.divider}`,
            borderRadius: radii.xl,
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            boxShadow: shadows.header,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div style={{ padding: compact ? "22px 0 18px" : "26px 22px 20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: compact ? "center" : "flex-start",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii.full,
                  background: colors.accent,
                  color: colors.surface,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  boxShadow: "0 12px 28px rgba(217,75,72,0.22)",
                }}
              >
                A
              </span>
              {!compact && (
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: colors.textPrimary, lineHeight: 1 }}>
                    AiCloset
                  </div>
                  <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 5 }}>
                    今日穿搭灵感
                  </div>
                </div>
              )}
            </div>
          </div>

          <nav style={{ flex: 1, padding: compact ? "0 10px" : "0 14px" }}>
            {NAV.map(({ path, label, icon }) => {
              const active = pathname.startsWith(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  title={compact ? label : undefined}
                  style={{
                    width: "100%",
                    height: 46,
                    border: "none",
                    borderRadius: radii.full,
                    background: active ? colors.accent : "transparent",
                    color: active ? colors.surface : colors.textSecondary,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: compact ? "center" : "flex-start",
                    gap: compact ? 0 : 12,
                    padding: compact ? 0 : "0 16px",
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: active ? fontWeight.semibold : fontWeight.medium,
                    boxShadow: active ? "0 12px 28px rgba(217,75,72,0.20)" : "none",
                    transition: transition.default,
                  }}
                >
                  <span style={{ fontSize: 18, display: "inline-flex" }}>{icon}</span>
                  {!compact && label}
                </button>
              );
            })}
          </nav>

          <div style={{ padding: compact ? "12px 10px 16px" : "16px 18px 20px" }}>
            {!compact && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
                  {user?.nickname || "穿搭用户"}
                </div>
                <div style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }}>
                  记录衣橱里的好品味
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="退出登录"
              style={{
                width: compact ? 44 : "100%",
                height: 40,
                border: "none",
                borderRadius: radii.full,
                background: colors.placeholder,
                color: colors.textSecondary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <LogoutOutlined />
              {!compact && "退出"}
            </button>
          </div>
        </aside>

        <main
          style={{
            flex: 1,
            marginLeft: sidebarW + 18,
            padding: `${spacing.xxxl}px ${spacing.xxl}px`,
            minWidth: 0,
          }}
        >
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: colors.bg }}>
      <header
        style={{
          height: 58,
          background: "rgba(255,250,247,0.86)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div>
          <div style={{ color: colors.textPrimary, fontSize: 17, fontWeight: 800 }}>AiCloset</div>
          <div style={{ color: colors.textTertiary, fontSize: fontSize.caption }}>
            {user?.nickname || "今天也要好看"}
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: 36,
            height: 36,
            border: "none",
            borderRadius: radii.full,
            background: colors.surface,
            color: colors.textSecondary,
            boxShadow: shadows.card,
          }}
        >
          <LogoutOutlined />
        </button>
      </header>

      <main style={{ padding: `${spacing.lg}px ${spacing.sm}px 92px` }}>
        <Outlet />
      </main>

      <nav
        style={{
          position: "fixed",
          bottom: 12,
          left: 14,
          right: 14,
          minHeight: 64,
          background: "rgba(255,255,255,0.90)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          boxShadow: shadows.nav,
          border: `1px solid ${colors.divider}`,
          borderRadius: radii.xl,
          display: "grid",
          gridTemplateColumns: `repeat(${NAV.length}, 1fr)`,
          zIndex: 100,
          padding: "7px",
        }}
      >
        {NAV.map(({ path, label, icon }) => {
          const active = pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                borderRadius: radii.lg,
                background: active ? colors.accentSoft : "transparent",
                cursor: "pointer",
                color: active ? colors.accent : colors.textSecondary,
                fontSize: 11,
                fontWeight: active ? fontWeight.semibold : fontWeight.medium,
                transition: transition.fast,
                gap: 2,
              }}
            >
              <span style={{ fontSize: 19, display: "inline-flex" }}>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
