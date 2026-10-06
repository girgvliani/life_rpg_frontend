/** One color per stat, the same as the phone app (ui/Theme.kt). Stat codes are always printed next to them. */
const STAT_COLORS: Record<string, string> = {
  MP: "#e879f9",
  PS: "#f87171",
  STA: "#facc15",
  H: "#a3e635",
  INT: "#60a5fa",
  DIS: "#22d3ee",
  FOC: "#a78bfa",
  SOC: "#4ade80",
  WLT: "#f59e0b",
};

export const statColor = (code: string) => STAT_COLORS[code] ?? "var(--accent)";
