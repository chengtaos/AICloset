import React from "react";
import { colors, spacing, fontSize } from "../../styles/tokens";

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function EmptyState({ icon, title, description, action, style }: Props) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: `${spacing.xxxl}px 0`,
        color: colors.textTertiary,
        ...style,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: spacing.sm, opacity: 0.35 }}>
        {icon || "👔"}
      </div>
      <div style={{ fontSize: fontSize.body, marginBottom: description ? spacing.xxs : 0 }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: fontSize.caption, marginBottom: action ? spacing.md : 0 }}>
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: spacing.sm }}>{action}</div>}
    </div>
  );
}
