import { useState } from "react";
import type { TraitDimension } from "../utils/styleProfile";
import { colors, fontWeight } from "../styles/tokens";

interface Props {
  dimensions: TraitDimension[];
  archetypeName: string;
  archetypeEmoji: string;
}

// Large viewBox to accommodate labels outside the radar circle
const SIZE = 340;
const CX = SIZE / 2; // 170
const CY = SIZE / 2; // 170
const R = 85;

interface AxisDef {
  dim: TraitDimension;
  angle: number;
  ex: number; // endpoint x at 100%
  ey: number; // endpoint y at 100%
}

function buildAxes(dimensions: TraitDimension[]): AxisDef[] {
  const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI]; // top, right, bottom, left
  return dimensions.map((dim, i) => {
    const angle = angles[i];
    return {
      dim,
      angle,
      ex: CX + R * Math.sin(angle),
      ey: CY - R * Math.cos(angle),
    };
  });
}

function pointOnAxis(axis: AxisDef, value: number): { x: number; y: number } {
  const ratio = value / 100;
  return {
    x: CX + (axis.ex - CX) * ratio,
    y: CY + (axis.ey - CY) * ratio,
  };
}

const ease = "cubic-bezier(0.4, 0, 0.2, 1)";

export default function StyleRadar({ dimensions, archetypeName, archetypeEmoji }: Props) {
  const [selectedAxis, setSelectedAxis] = useState<AxisDef | null>(null);

  const axes = buildAxes(dimensions);
  const polygonPoints = axes
    .map((a) => pointOnAxis(a, a.dim.value))
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  const gridLevels = [25, 50, 75, 100];

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 380 }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          {/* Grid polygons */}
          {gridLevels.map((level) => {
            const pts = axes
              .map((a) => pointOnAxis(a, level))
              .map((p) => `${p.x},${p.y}`)
              .join(" ");
            return (
              <polygon
                key={level}
                points={pts}
                fill="none"
                stroke={colors.divider}
                strokeWidth="1"
              />
            );
          })}

          {/* Axis lines */}
          {axes.map((axis) => (
            <line
              key={`line-${axis.dim.key}`}
              x1={CX}
              y1={CY}
              x2={axis.ex}
              y2={axis.ey}
              stroke={colors.divider}
              strokeWidth="1"
            />
          ))}

          {/* Data polygon */}
          <polygon
            points={polygonPoints}
            fill="rgba(196,76,58,0.13)"
            stroke={colors.accent}
            strokeWidth="2"
            strokeLinejoin="round"
            style={{ transition: `all 0.5s ${ease}` }}
          />

          {/* Data points */}
          {axes.map((axis) => {
            const p = pointOnAxis(axis, axis.dim.value);
            return (
              <circle
                key={`pt-${axis.dim.key}`}
                cx={p.x}
                cy={p.y}
                r={4}
                fill={colors.accent}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}

          {/* Grid dots at 25/50/75 */}
          {[25, 50, 75].map((level) =>
            axes.map((axis) => {
              const p = pointOnAxis(axis, level);
              return (
                <circle
                  key={`dot-${level}-${axis.dim.key}`}
                  cx={p.x}
                  cy={p.y}
                  r={1.5}
                  fill={colors.textTertiary}
                />
              );
            }),
          )}

          {/* Clickable regions */}
          {axes.map((axis) => {
            const mid = pointOnAxis(axis, 55);
            return (
              <circle
                key={`hit-${axis.dim.key}`}
                cx={mid.x}
                cy={mid.y}
                r={34}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedAxis(axis)}
              />
            );
          })}

          {/* Center label */}
          <text
            x={CX}
            y={CY - 6}
            textAnchor="middle"
            style={{ fontSize: 24, pointerEvents: "none" }}
          >
            {archetypeEmoji}
          </text>
          <text
            x={CX}
            y={CY + 16}
            textAnchor="middle"
            style={{
              fontSize: 11,
              fontWeight: fontWeight.semibold,
              fill: colors.textPrimary,
              pointerEvents: "none",
            }}
          >
            {archetypeName}
          </text>

          {/* Axis endpoint labels — placed outside the circle */}
          {axes.map((axis) => {
            const labelDist = R + 52;
            const lx = CX + labelDist * Math.sin(axis.angle);
            const ly = CY - labelDist * Math.cos(axis.angle);

            // Inline label: dim name
            return (
              <g key={`label-${axis.dim.key}`}>
                <text
                  x={lx}
                  y={ly - 4}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  style={{
                    fontSize: 11,
                    fontWeight: fontWeight.medium,
                    fill: colors.textPrimary,
                    pointerEvents: "none",
                  }}
                >
                  {axis.dim.label}
                </text>
                <text
                  x={lx}
                  y={ly + 10}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  style={{
                    fontSize: 10,
                    fill: colors.textSecondary,
                    pointerEvents: "none",
                  }}
                >
                  {axis.dim.value < 50 ? axis.dim.left : axis.dim.right}
                </text>
                <text
                  x={lx}
                  y={ly + 22}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  style={{
                    fontSize: 13,
                    fontWeight: fontWeight.semibold,
                    fill: colors.accent,
                    pointerEvents: "none",
                  }}
                >
                  {axis.dim.value}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Detail popup */}
        {selectedAxis && (
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 999,
                background: "rgba(0,0,0,0.15)",
              }}
              onClick={() => setSelectedAxis(null)}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                maxWidth: 360,
                margin: "0 auto",
                background: colors.surface,
                borderRadius: 16,
                padding: "20px 24px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                animation: "slide-up 0.25s ease-out",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: 8 }}>
                {selectedAxis.dim.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: colors.textTertiary }}>{selectedAxis.dim.left}</span>
                <div style={{ flex: 1, height: 4, background: colors.divider, borderRadius: 2, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${selectedAxis.dim.value}%`,
                      background: `linear-gradient(90deg, ${colors.textTertiary}, ${colors.accent})`,
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: colors.textTertiary }}>{selectedAxis.dim.right}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: fontWeight.bold, color: colors.accent }}>
                {selectedAxis.dim.value}%
              </div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 1.7 }}>
                {getDimensionHint(selectedAxis.dim)}
              </div>
              <button
                onClick={() => setSelectedAxis(null)}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 16,
                  border: "none",
                  background: "none",
                  color: colors.textTertiary,
                  fontSize: 18,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          </>
        )}

        <style>{`
          @keyframes slide-up {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}

function getDimensionHint(dim: TraitDimension): string {
  const high = dim.value >= 50;
  switch (dim.key) {
    case "style":
      return high
        ? "你偏好潮流与设计感，喜欢尝试新风格，对流行趋势保持开放态度。"
        : "你偏爱经典与基础款，追求 timeless 风格，不受短期潮流影响。";
    case "color":
      return high
        ? "你敢于运用色彩表达自己，衣橱中亮色和撞色搭配占比较高，穿搭充满活力。"
        : "你偏好沉稳的中性色系，黑、白、灰、大地色是你的舒适区，整体风格低调耐看。";
    case "complexity":
      return high
        ? "你享受层次搭配的乐趣，配饰和叠穿是你的拿手好戏，造型丰富多变。"
        : "你信奉简约即高级，干净的线条和基础单品就能穿出好品味。";
    case "expression":
      return high
        ? "你用服装当作自我表达的画布，独特的设计和风格元素让你在人群中脱颖而出。"
        : "你注重功能性和实穿性，衣橱中的每一件都经过实用考量，务实而不失风格。";
    default:
      return "";
  }
}
