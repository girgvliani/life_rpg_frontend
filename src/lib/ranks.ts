/** The server's F -> SSS ladder. The chart's outer ring is the top of A; S and up break past it. */
export const RANKS = [
  { letter: "SSS", min: 95, max: 100 },
  { letter: "SS", min: 90, max: 94 },
  { letter: "S", min: 85, max: 89 },
  { letter: "A+", min: 80, max: 84 },
  { letter: "A", min: 75, max: 79 },
  { letter: "A-", min: 70, max: 74 },
  { letter: "B", min: 60, max: 69 },
  { letter: "C", min: 50, max: 59 },
  { letter: "D", min: 40, max: 49 },
  { letter: "F", min: 0, max: 39 },
];

export const CHART_EDGE = 85;

/** The phone app's rank colors (ui/Theme.kt): S tiers gold, A pink, B blue, C cyan, D orange, F red. */
export function rankColor(letter: string | null | undefined): string {
  if (!letter) return "var(--outline)";
  if (letter.startsWith("S")) return "var(--gold)";
  if (letter.startsWith("A")) return "var(--accent)";
  return { B: "#60a5fa", C: "#22d3ee", D: "#fb923c" }[letter] ?? "var(--bad)";
}
