import { useState } from "react";
import { colors, radii } from "../../styles/tokens";
import { getImageUrl } from "../../utils/imageUrl";

interface Props {
  src?: string | null;
  alt?: string;
  aspectRatio?: string;
  radius?: number;
  objectFit?: "cover" | "contain";
  width?: number | string;
  height?: number | string;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function ImageBlock({
  src,
  alt = "",
  aspectRatio,
  radius = radii.md,
  objectFit = "cover",
  width,
  height,
  placeholder,
  fallback,
  style,
}: Props) {
  const [error, setError] = useState(false);
  const url = getImageUrl(src);
  const hasImg = !error && !!url;

  const sizeStyle: React.CSSProperties = {};
  if (width) sizeStyle.width = width;
  if (height) sizeStyle.height = height;
  if (aspectRatio) sizeStyle.aspectRatio = aspectRatio;

  const wrapperStyle: React.CSSProperties = {
    ...sizeStyle,
    background: colors.placeholder,
    borderRadius: radius,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...style,
  };

  if (hasImg) {
    return (
      <div style={wrapperStyle}>
        <img
          src={url}
          alt={alt}
          onError={() => setError(true)}
          style={{ width: "100%", height: "100%", objectFit }}
          loading="lazy"
        />
      </div>
    );
  }

  if (fallback) {
    return <div style={wrapperStyle}>{fallback}</div>;
  }

  if (placeholder) {
    return <div style={wrapperStyle}>{placeholder}</div>;
  }

  return (
    <div style={wrapperStyle}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="1">
        <rect x="2" y="6" width="20" height="13" rx="2" />
        <circle cx="8.5" cy="10.5" r="1.5" />
        <path d="M2 15l5-4 4 3 3-5 8 8" />
      </svg>
    </div>
  );
}
