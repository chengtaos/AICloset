// ── AiCloset Design Tokens ──
// 小红书 + iOS 混合审美 · 低饱和暖红 · 阴影替代边框 · 8px spacing

export const colors = {
  accent: "#9a6f68",
  accentHover: "#815b55",
  accentSoft: "rgba(154,111,104,0.11)",
  accentMuted: "rgba(154,111,104,0.18)",
  bg: "#f7f4f1",
  surface: "#fffefd",
  textPrimary: "#262321",
  textSecondary: "#7b746e",
  textTertiary: "#ada39c",
  divider: "rgba(38,35,33,0.08)",
  placeholder: "#eee8e3",
  success: "#71816d",
  warning: "#aa875d",
  error: "#b0655f",
  laundry: "#9c7a58",
} as const;

export const shadows = {
  card: "0 10px 30px rgba(72,62,55,0.07)",
  cardHover: "0 18px 48px rgba(72,62,55,0.12)",
  elevated: "0 24px 76px rgba(72,62,55,0.13)",
  nav: "0 -12px 34px rgba(72,62,55,0.10)",
  header: "0 10px 32px rgba(72,62,55,0.08)",
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
