import React from "react";
import { useResponsive } from "../../hooks/useResponsive";
import { spacing } from "../../styles/tokens";

interface Props {
  children: React.ReactNode;
  columns?: { mobile?: number; tablet?: number; desktop?: number };
  minCardWidth?: number;
  gap?: number;
  mobileGap?: number;
  style?: React.CSSProperties;
}

export default function Grid({
  children,
  columns = {},
  minCardWidth = 152,
  gap = spacing.md,
  mobileGap = spacing.xs,
  style,
}: Props) {
  const { isMobile, isTablet } = useResponsive();

  const colMobile = columns.mobile ?? 2;
  const colTablet = columns.tablet ?? 3;
  // desktop: auto-fill with min width, unless explicitly set
  const colDesktop = columns.desktop;

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gap: isMobile ? mobileGap : gap,
    ...(isMobile
      ? { gridTemplateColumns: `repeat(${colMobile}, 1fr)` }
      : isTablet
        ? { gridTemplateColumns: `repeat(${colTablet}, 1fr)` }
        : colDesktop
          ? { gridTemplateColumns: `repeat(${colDesktop}, 1fr)` }
          : { gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))` }),
    ...style,
  };

  return <div style={gridStyle}>{children}</div>;
}
