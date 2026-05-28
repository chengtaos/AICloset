import { colors, radii, spacing, fontSize, fontWeight, transition } from "../../styles/tokens";

interface Props {
  children: React.ReactNode;
  variant?: "outline" | "filled" | "ghost";
  size?: "sm" | "md";
  active?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function Tag({
  children,
  variant = "outline",
  size = "md",
  active = false,
  onClick,
  style,
}: Props) {
  const isClickable = !!onClick;

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    fontSize: size === "sm" ? fontSize.caption : fontSize.body,
    fontWeight: active ? fontWeight.semibold : fontWeight.regular,
    borderRadius: radii.sm,
    padding: size === "sm" ? `2px ${spacing.xs}px` : `${spacing.xxs}px ${spacing.sm}px`,
    cursor: isClickable ? "pointer" : undefined,
    transition: transition.fast,
    whiteSpace: "nowrap",
    flexShrink: 0,
    ...(active || variant === "filled"
      ? {
          border: "none",
          background: colors.accentSoft,
          color: colors.accent,
        }
      : variant === "ghost"
        ? {
            border: "none",
            background: "transparent",
            color: colors.textSecondary,
          }
        : {
            border: `1px solid ${colors.divider}`,
            background: "transparent",
            color: colors.textSecondary,
          }),
    ...(isClickable && !active
      ? {
          // hover state via inline onMouse events would be ideal, but for simplicity
          // the parent can wrap in a component with hover
        }
      : {}),
    ...style,
  };

  if (isClickable) {
    return (
      <button type="button" style={{ ...base, border: active ? "none" : base.border }} onClick={onClick}>
        {children}
      </button>
    );
  }

  return <span style={base}>{children}</span>;
}
