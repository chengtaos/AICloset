import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { colors, shadows, spacing, fontSize, fontWeight, transition, radii } from "../styles/tokens";
import { Caption } from "./ui/Typography";

const SIDEBAR_FULL = 220;
const SIDEBAR_COMPACT = 64;

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/recommend": <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg>,
  "/outfits": <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  "/wardrobe": <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M12 9v12"/></svg>,
  "/settings": <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4m-14.2 0l1.4-1.4m11.4-11.4l1.4-1.4"/></svg>,
};

const NAV = [
  { path: "/recommend", label: "推荐" },
  { path: "/outfits", label: "搭配" },
  { path: "/wardrobe", label: "衣橱" },
  { path: "/settings", label: "设置" },
];

const ease = "cubic-bezier(0.4, 0, 0.2, 1)";

function SidebarNavItem({
  path,
  label,
  active,
  compact,
  onClick,
}: {
  path: string;
  label: string;
  active: boolean;
  compact: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={compact ? label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: compact ? "center" : "flex-start",
        gap: compact ? 0 : 12,
        width: "100%",
        height: 42,
        padding: compact ? "0" : "0 12px",
        marginBottom: 1,
        border: "none",
        borderLeft: `3px solid ${active ? colors.accent : "transparent"}`,
        borderRadius: compact ? radii.sm : `0 ${radii.sm}px ${radii.sm}px 0`,
        background: active ? colors.accentSoft : "transparent",
        cursor: "pointer",
        color: active ? colors.accent : colors.textSecondary,
        fontSize: 14,
        fontWeight: active ? fontWeight.semibold : fontWeight.regular,
        textAlign: "left",
        transition: `background 0.2s ${ease}, color 0.2s ${ease}, border-color 0.2s ${ease}`,
        margin: compact ? "0 auto 1px" : undefined,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = colors.accentSoft;
          e.currentTarget.style.color = colors.textPrimary;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = colors.textSecondary;
        }
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          transform: active ? "scale(1.05)" : "scale(1)",
          transition: `transform 0.2s ${ease}`,
        }}
      >
        {NAV_ICONS[path]}
      </span>
      {!compact && label}
    </button>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const sidebarW = isDesktop ? SIDEBAR_FULL : isTablet ? SIDEBAR_COMPACT : 0;

  // ── 桌面 / 平板：左侧固定侧边栏 ──
  if (isTablet || isDesktop) {
    const compact = isTablet;
    return (
      <div style={{ minHeight: "100vh", background: colors.bg, display: "flex" }}>
        <aside
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: sidebarW,
            background: colors.surface,
            borderRight: `1px solid ${colors.divider}`,
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            animation: "slide-in 0.35s ease-out",
          }}
        >
          {/* 品牌 */}
          <div
            style={{
              padding: compact ? "20px 0" : "28px 24px 24px",
              textAlign: compact ? "center" : "left",
            }}
          >
            {compact ? (
              <span style={{ fontSize: 18, fontWeight: 700, color: colors.accent, letterSpacing: "-0.03em" }}>
                A
              </span>
            ) : (
              <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary, letterSpacing: "-0.03em", margin: 0 }}>
                AiCloset
              </h1>
            )}
          </div>

          {/* 导航 */}
          <nav
            style={{
              flex: 1,
              padding: compact ? "0 6px" : "0 12px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {NAV.map(({ path, label }) => (
              <SidebarNavItem
                key={path}
                path={path}
                label={label}
                compact={compact}
                active={pathname.startsWith(path)}
                onClick={() => navigate(path)}
              />
            ))}
          </nav>

          {/* 用户区 */}
          <div
            style={{
              padding: compact ? "12px 0 16px" : "16px 20px 20px",
              borderTop: `1px solid ${colors.divider}`,
              textAlign: compact ? "center" : "left",
            }}
          >
            {compact ? (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: colors.accentSoft,
                  color: colors.accent,
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 6px",
                }}
              >
                {(user?.nickname || "A")[0]}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary, marginBottom: 6 }}>
                  {user?.nickname || "用户"}
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    border: "none", background: "none",
                    color: colors.textTertiary, fontSize: 12,
                    cursor: "pointer", padding: 0,
                    transition: `color 0.15s ${ease}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = colors.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = colors.textTertiary; }}
                >
                  退出登录
                </button>
              </>
            )}
            {compact && (
              <button
                onClick={handleLogout}
                title="退出登录"
                style={{
                  border: "none", background: "none",
                  color: colors.textTertiary, cursor: "pointer",
                  padding: 0, display: "block", margin: "0 auto",
                  transition: `color 0.15s ${ease}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = colors.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = colors.textTertiary; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16,17 21,12 16,7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </aside>

        <main
          style={{
            flex: 1,
            marginLeft: sidebarW,
            padding: `${spacing.xxxl}px ${spacing.xxl}px`,
            minWidth: 0,
          }}
        >
          <Outlet />
        </main>
      </div>
    );
  }

  // ── 移动端：顶部 Header + 内容 + 底部导航 ──
  return (
    <div style={{ minHeight: "100vh", background: colors.bg }}>
      <header
        style={{
          height: 44,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: shadows.header,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
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
            border: "none", background: "none",
            color: colors.textTertiary, fontSize: fontSize.caption,
            cursor: "pointer",
          }}
        >
          退出
        </button>
      </header>

      <main
        style={{
          padding: `${spacing.lg}px ${spacing.sm}px 80px`,
        }}
      >
        <Outlet />
      </main>

      <nav
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          height: 52,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: shadows.nav,
          display: "flex", justifyContent: "center",
          zIndex: 100,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {NAV.map(({ path, label }) => {
          const active = pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                flex: 1, maxWidth: 72,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                border: "none", background: "transparent",
                cursor: "pointer",
                color: active ? colors.accent : colors.textSecondary,
                fontSize: 10,
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
