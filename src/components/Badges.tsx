import { useId, useState } from "react";
import { API_URL } from "../api/client";

/** Bronze → Legend: the hexagon's colours, top to bottom (the phone uses the same ones) */
export const TIER_COLORS: Record<number, string[]> = {
  1: ["#8b6cf6", "#5b3fd6"],
  2: ["#e879f9", "#9d27b0"],
  3: ["#ffd166", "#e08a00"],
  4: ["#ff6bd5", "#ffb86b", "#7c5cff"],
};
export const TIER_NAMES: Record<number, string> = { 1: "Bronze", 2: "Silver", 3: "Gold", 4: "Legend" };
export const tierColor = (tier: number) => TIER_COLORS[Math.min(4, Math.max(1, tier))][0];

/** A pointy-top hexagon with rounded corners, as an SVG path */
function hexPath(cx: number, cy: number, r: number, corner: number) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  const t = Math.min(0.5, corner / r);
  let d = "";
  pts.forEach(([x, y], i) => {
    const [px, py] = pts[(i + 5) % 6];
    const [nx, ny] = pts[(i + 1) % 6];
    const from = [x + (px - x) * t, y + (py - y) * t];
    const to = [x + (nx - x) * t, y + (ny - y) * t];
    d += `${i === 0 ? "M" : "L"}${from[0].toFixed(2)},${from[1].toFixed(2)} Q${x.toFixed(2)},${y.toFixed(2)} ${to[0].toFixed(2)},${to[1].toFixed(2)} `;
  });
  return d + "Z";
}

const OUTER = hexPath(50, 50, 50, 9);
const INNER = hexPath(50, 50, 42, 7);
const WEDGES = Array.from({ length: 6 }, (_, i) => {
  const a = ((-90 + i * 60) * Math.PI) / 180;
  const b = ((-90 + (i + 1) * 60) * Math.PI) / 180;
  return `M50,50 L${50 + 42 * Math.cos(a)},${50 + 42 * Math.sin(a)} L${50 + 42 * Math.cos(b)},${50 + 42 * Math.sin(b)} Z`;
});

/**
 * A hexagonal badge: white ring, the tier's gradient with low-poly facets, the icon as a white
 * silhouette. Locked: grey ring, dark fill, faint grey icon. Legend badges get a turning shine.
 */
export function HexBadge({ icon, tier, earned, size = 64, label }: { icon: string; tier: number; earned: boolean; size?: number; label?: string }) {
  const id = useId().replace(/:/g, "");
  const colors = TIER_COLORS[Math.min(4, Math.max(1, tier))];
  return (
    <span className={`hex-badge ${earned ? "earned" : "locked"} ${earned && tier >= 4 ? "legend" : ""}`} style={{ width: size, height: size }}
      role="img" aria-label={label ?? `${earned ? "" : "Locked: "}${icon}`}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            {colors.map((c, i) => <stop key={c} offset={i / Math.max(1, colors.length - 1)} stopColor={c} />)}
          </linearGradient>
          <clipPath id={`c${id}`}><path d={INNER} /></clipPath>
        </defs>
        <path d={OUTER} fill={earned ? "#fff" : "#4a4660"} />
        <g clipPath={`url(#c${id})`}>
          <rect width="100" height="100" fill={earned ? `url(#g${id})` : "#221f33"} />
          {earned && WEDGES.map((d, i) => <path key={i} d={d} fill={i % 2 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.10)"} />)}
          {earned && <path d="M50,56 L25,92 L75,92 Z" fill="rgba(255,255,255,0.10)" />}
          {earned && tier >= 4 && (
            <g className="hex-shine"><path d="M50,50 L50,-30 L110,-10 Z" fill="rgba(255,255,255,0.35)" /></g>
          )}
        </g>
      </svg>
      <span className="hex-icon" style={{ fontSize: size * 0.4 }} aria-hidden>{icon}</span>
    </span>
  );
}

/** A round profile photo, or the name's first letter on the accent gradient */
export function Avatar({ path, name, size = 40, ring }: { path?: string | null; name: string; size?: number; ring?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = path ? (path.startsWith("http") || path.startsWith("blob:") ? path : `${API_URL}${path}`) : null;
  const letter = (name.replace(/^Player /, "").match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();
  return (
    <span className={`avatar ${ring ? "ring" : ""}`} style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {src && !failed ? <img src={src} alt={name} onError={() => setFailed(true)} /> : <span aria-hidden>{letter}</span>}
    </span>
  );
}
