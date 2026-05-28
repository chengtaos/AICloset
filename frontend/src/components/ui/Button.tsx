import { colors, radii, spacing, fontSize, fontWeight, fontStack, transition } from "../../styles/tokens";

interface Props {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "text";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  block?: boolean;
  style?: React.CSSProperties;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  block = false,
  style,
}: Props) {
  const sizeMap = {
    sm: { height: 32, padding: `0 ${spacing.sm}px`, fontSize: fontSize.caption },
    md: { height: 40, padding: `0 ${spacing.md}px`, fontSize: fontSize.body },
    lg: { height: 48, padding: `0 ${spacing.xl}px`, fontSize: fontSize.bodyLarge },
  };

  const v = sizeMap[size];

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    border: "none",
    outline: "none",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    fontFamily: fontStack,
    fontWeight: fontWeight.medium,
    fontSize: v.fontSize,
    height: v.height,
    padding: v.padding,
    borderRadius: radii.sm,
    transition: transition.fast,
    opacity: disabled ? 0.5 : loading ? 0.8 : 1,
    width: block ? "100%" : undefined,
    ...(variant === "primary"
      ? {
          background: colors.accent,
          color: colors.surface,
        }
      : variant === "secondary"
        ? {
            background: colors.accentSoft,
            color: colors.accent,
          }
        : variant === "ghost"
          ? {
              background: "transparent",
              color: colors.textSecondary,
            }
          : {
              background: "transparent",
              color: colors.accent,
            }),
    ...style,
  };

  return (
    <button type="button" style={base} disabled={disabled || loading} onClick={onClick}>
      {loading && <span style={{ opacity: 0.6 }}>⋯</span>}
      {children}
    </button>
  );
}
