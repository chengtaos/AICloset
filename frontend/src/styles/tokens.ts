// ── AiCloset Design Tokens ──
// 小红书 + iOS 混合审美 · 低饱和暖红 · 阴影替代边框 · 8px spacing

export const colors = {
  accent: "#c44c3a",
  accentHover: "#a33a2e",
  accentSoft: "rgba(196,76,58,0.08)",
  accentMuted: "rgba(196,76,58,0.15)",
  bg: "#f8f6f4",
  surface: "#ffffff",
  textPrimary: "#2c2c2c",
  textSecondary: "#999",
  textTertiary: "#bfbfbf",
  divider: "#f0f0f0",
  placeholder: "#f5f5f5",
  success: "#52c41a",
  warning: "#faad14",
  error: "#ff4d4f",
  laundry: "#d48806",
} as const;

export const shadows = {
  card: "0 1px 3px rgba(0,0,0,0.04)",
  cardHover: "0 4px 16px rgba(0,0,0,0.06)",
  elevated: "0 8px 32px rgba(0,0,0,0.08)",
  nav: "0 -1px 3px rgba(0,0,0,0.04)",
  header: "0 1px 3px rgba(0,0,0,0.04)",
  none: "none",
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const fontStack =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif';

export const fontSize = {
  caption: 11,
  body: 13,
  bodyLarge: 14,
  subtitle: 15,
  title: 18,
  titleLarge: 22,
  display: 28,
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const transition = {
  default: "all 0.2s ease",
  fast: "all 0.15s ease",
} as const;

// ── 便捷样式工厂 ──

/** 标准卡片容器 */
export function cardStyle(overrides?: React.CSSProperties): React.CSSProperties {
  return {
    background: colors.surface,
    borderRadius: radii.lg,
    boxShadow: shadows.card,
    transition: transition.default,
    ...overrides,
  };
}

/** 分隔线样式 */
export function dividerStyle(): React.CSSProperties {
  return {
    border: "none",
    borderTop: `1px solid ${colors.divider}`,
  };
}
