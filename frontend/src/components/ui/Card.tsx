import React, { useState } from "react";
import { colors, shadows, radii, spacing, transition } from "../../styles/tokens";

interface Props {
  children: React.ReactNode;
  variant?: "default" | "flat" | "elevated";
  padding?: number | string;
  radius?: number;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function Card({
  children,
  variant = "default",
  padding = spacing.lg,
  radius = radii.lg,
  onClick,
  className,
  style,
}: Props) {
  const [hover, setHover] = useState(false);

  const base: React.CSSProperties = {
    background: variant === "flat" ? "transparent" : colors.surface,
    borderRadius: radius,
    padding,
    cursor: onClick ? "pointer" : undefined,
    transition: transition.default,
    transform: hover && onClick ? "translateY(-2px)" : "translateY(0)",
    ...(variant === "elevated"
      ? { boxShadow: shadows.elevated }
      : variant === "flat"
        ? { boxShadow: shadows.none }
        : { boxShadow: hover ? shadows.cardHover : shadows.card }),
    ...style,
  };

  return (
    <div
      className={className}
      style={base}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </div>
  );
}
