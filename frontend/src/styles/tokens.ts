// ── AiCloset Design Tokens ──
// 小红书 + iOS 混合审美 · 低饱和暖红 · 阴影替代边框 · 8px spacing

export const colors = {
  accent: "#d94b48",
  accentHover: "#bd3836",
  accentSoft: "rgba(217,75,72,0.09)",
  accentMuted: "rgba(217,75,72,0.16)",
  bg: "#fffaf7",
  surface: "#ffffff",
  textPrimary: "#1f1f1f",
  textSecondary: "#77706d",
  textTertiary: "#b9aeaa",
  divider: "rgba(31,31,31,0.07)",
  placeholder: "#f6efeb",
  success: "#52c41a",
  warning: "#faad14",
  error: "#ff4d4f",
  laundry: "#d48806",
} as const;

export const shadows = {
  card: "0 8px 28px rgba(86,56,46,0.07)",
  cardHover: "0 18px 46px rgba(86,56,46,0.12)",
  elevated: "0 22px 70px rgba(86,56,46,0.13)",
  nav: "0 -12px 34px rgba(86,56,46,0.10)",
  header: "0 10px 32px rgba(86,56,46,0.08)",
  none: "none",
} as const;

export const radii = {
  sm: 14,
  md: 18,
  lg: 24,
  xl: 30,
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
  titleLarge: 24,
  display: 32,
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
