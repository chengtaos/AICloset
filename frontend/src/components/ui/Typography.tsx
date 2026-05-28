import React from "react";
import { colors, fontSize, fontWeight } from "../../styles/tokens";

interface BaseProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
}

function createElement(as: keyof JSX.IntrinsicElements, props: BaseProps & { baseStyle: React.CSSProperties }) {
  const { children, style, baseStyle } = props;
  const Tag = props.as || as;
  return <Tag style={{ ...baseStyle, ...style }}>{children}</Tag>;
}

export function Title({ children, style, as }: BaseProps) {
  return createElement("h2", {
    children, style, as,
    baseStyle: { fontSize: fontSize.titleLarge, fontWeight: fontWeight.semibold, color: colors.textPrimary, margin: 0, lineHeight: 1.3 },
  });
}

export function Subtitle({ children, style, as }: BaseProps) {
  return createElement("h3", {
    children, style, as,
    baseStyle: { fontSize: fontSize.subtitle, fontWeight: fontWeight.semibold, color: colors.textPrimary, margin: 0 },
  });
}

export function SectionTitle({ children, style, as }: BaseProps) {
  return createElement("h4", {
    children, style, as,
    baseStyle: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.textPrimary, margin: 0 },
  });
}

export function Label({ children, style, as }: BaseProps) {
  return createElement("span", {
    children, style, as,
    baseStyle: { fontSize: fontSize.caption, fontWeight: fontWeight.medium, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em" },
  });
}

export function Body({ children, style, as }: BaseProps) {
  return createElement("p", {
    children, style, as,
    baseStyle: { fontSize: fontSize.body, color: colors.textPrimary, margin: 0, lineHeight: 1.7 },
  });
}

export function Caption({ children, style, as }: BaseProps) {
  return createElement("span", {
    children, style, as,
    baseStyle: { fontSize: fontSize.caption, color: colors.textSecondary },
  });
}

export function Aux({ children, style, as }: BaseProps) {
  return createElement("span", {
    children, style, as,
    baseStyle: { fontSize: fontSize.caption, color: colors.textTertiary },
  });
}
