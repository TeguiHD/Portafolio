import type { ReactElement } from "react";

export function PulseAppIcon({ size, compact = false }: { size: number; compact?: boolean }): ReactElement {
  const titleSize = compact ? Math.round(size * 0.28) : Math.round(size * 0.2);
  const chipSize = Math.max(20, Math.round(size * 0.11));

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: size * 0.12,
        background:
          "radial-gradient(circle at 18% 18%, rgba(103,232,249,0.28), transparent 34%), linear-gradient(135deg, #071019 0%, #0f2740 58%, #05342f 100%)",
        borderRadius: size * 0.22,
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: size * 0.03,
            color: "#A5F3FC",
            fontSize: Math.max(12, Math.round(size * 0.06)),
            letterSpacing: compact ? 2 : 4,
            textTransform: "uppercase",
          }}
        >
          Pulse
        </div>
        <div
          style={{
            width: chipSize,
            height: chipSize,
            borderRadius: chipSize / 2,
            background: "#34D399",
            boxShadow: "0 0 18px rgba(52,211,153,0.9)",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: size * 0.04 }}>
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: -1,
          }}
        >
          DP
        </div>
        {!compact ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: size * 0.03,
              fontSize: Math.max(14, Math.round(size * 0.065)),
              color: "rgba(255,255,255,0.78)",
            }}
          >
            Command Center
          </div>
        ) : null}
      </div>
    </div>
  );
}
