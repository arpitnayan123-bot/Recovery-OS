"use client";

import { useTheme } from "@/hooks/use-theme";

/**
 * Shared theme-aware chart styling for all console recharts.
 * Returns tooltip/axis/grid colors that adapt to the active console theme.
 */
export function useChartTheme() {
  const theme = useTheme();
  const isLight = theme === "light";
  return {
    tooltip: {
      background: isLight ? "rgba(255,255,255,0.97)" : "rgba(11,14,12,0.95)",
      border: isLight ? "1px solid rgba(12,122,75,0.25)" : "1px solid rgba(45,240,156,0.22)",
      borderRadius: "8px",
      color: isLight ? "#0e1410" : "#ecefe9",
      fontFamily: "var(--font-inter)",
      fontSize: "12px",
      padding: "8px 12px",
    } as const,
    axis: { fontSize: 11, fill: isLight ? "rgba(14,20,16,0.55)" : "rgba(236,239,233,0.55)", fontFamily: "var(--font-mono)" } as const,
    grid: isLight ? "rgba(14,20,16,0.08)" : "rgba(236,239,233,0.06)",
    axisLine: isLight ? "rgba(14,20,16,0.12)" : "rgba(236,239,233,0.1)",
    refLine: isLight ? "rgba(12,122,75,0.3)" : "rgba(45,240,156,0.3)",
    legend: { fontSize: 10, fontFamily: "var(--font-mono)", color: isLight ? "rgba(14,20,16,0.6)" : "rgba(236,239,233,0.6)" } as const,
    isLight,
  };
}
