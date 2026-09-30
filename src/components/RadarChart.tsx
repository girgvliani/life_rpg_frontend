import { useState } from "react";
import type { StatResult } from "../api/types";
import { CHART_EDGE, rankColor } from "../lib/ranks";

const SIZE = 400;
const CENTER = SIZE / 2;
const OUTER = 192;
const EDGE = OUTER * 0.46; // radius of score 85, the top of A; S-tier scores break past it
const BADGE = OUTER * 0.7;
const LABEL = OUTER * 0.9;
const GRID = [40, 60, 70, CHART_EDGE]; // D, B and A- thresholds, then the A edge

/**
 * The character's stats as one shape: a corner per stat, rank badges on the inner ring, names in the
 * outer band. One series, one color; the names are always printed, so color never carries identity.
 */
export function RadarChart({ stats }: { stats: StatResult[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = stats.length;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const point = (i: number, r: number): [number, number] => [CENTER + r * Math.cos(angle(i)), CENTER + r * Math.sin(angle(i))];
  const polygon = (radius: (i: number) => number) => stats.map((_, i) => point(i, radius(i)).join(",")).join(" ");
  const radiusOf = (i: number) => (EDGE * Math.min(100, Math.max(0, stats[i].score ?? 0))) / CHART_EDGE;
  const hovered = hover !== null ? stats[hover] : null;
  const [tipX, tipY] = hover !== null ? point(hover, radiusOf(hover)) : [0, 0];

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Stat chart: ${stats.map((s) => `${s.name} ${s.score ?? "no data"}`).join(", ")}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        {/* Card rings: an outer band for the names, an inner ring carrying the badges */}
        <circle cx={CENTER} cy={CENTER} r={OUTER} fill="rgba(33,30,61,0.35)" stroke="var(--outline)" strokeWidth={2} />
        <circle cx={CENTER} cy={CENTER} r={OUTER * 0.8} fill="var(--bg)" stroke="var(--outline)" strokeWidth={1.5} />
        <circle cx={CENTER} cy={CENTER} r={BADGE} fill="none" stroke="var(--hairline)" strokeWidth={1} />

        <polygon points={polygon(() => EDGE)} fill="var(--surface)" />
        {GRID.map((level) => (
          <polygon
            key={level}
            points={polygon(() => (EDGE * level) / CHART_EDGE)}
            fill="none"
            stroke={level === CHART_EDGE ? "var(--outline)" : "var(--hairline)"}
            strokeWidth={level === CHART_EDGE ? 1.5 : 1}
          />
        ))}
        {stats.map((_, i) => {
          const [x, y] = point(i, EDGE);
          return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="var(--hairline)" strokeWidth={1} />;
        })}

        <defs>
          <radialGradient id="radar-fill">
            <stop offset="0%" stopColor="#e879f9" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.22} />
          </radialGradient>
        </defs>
        <polygon points={polygon(radiusOf)} fill="url(#radar-fill)" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />

        {stats.map((stat, i) => {
          const [x, y] = point(i, radiusOf(i));
          const [bx, by] = point(i, BADGE);
          const [lx, ly] = point(i, LABEL);
          const brokeOut = (stat.score ?? 0) >= CHART_EDGE;
          return (
            <g key={stat.code}>
              {brokeOut && <circle cx={x} cy={y} r={11} fill="var(--gold)" opacity={0.28} />}
              <circle cx={x} cy={y} r={4.5} fill={brokeOut ? "var(--gold)" : "var(--accent)"} stroke="var(--bg)" strokeWidth={2} />
              <circle cx={bx} cy={by} r={17} fill="var(--bg)" stroke={rankColor(stat.grade)} strokeWidth={2} />
              <text x={bx} y={by} textAnchor="middle" dominantBaseline="central" fill={rankColor(stat.grade)}
                fontFamily="var(--font-display)" fontWeight={700} fontSize={(stat.grade?.length ?? 1) > 2 ? 11 : 14}>
                {stat.grade ?? "–"}
              </text>
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill="var(--text-muted)" fontSize={13} fontWeight={700} letterSpacing={1}>
                {stat.code}
              </text>
              {/* Hit target, bigger than the dot; keyboard reachable */}
              <circle
                cx={x} cy={y} r={16} fill="transparent" tabIndex={0} style={{ cursor: "pointer", outline: "none" }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              >
                <title>{`${stat.name}: ${stat.score ?? "no data"} ${stat.grade ?? ""}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div className="chart-tooltip" style={{ left: `${(tipX / SIZE) * 100}%`, top: `${(tipY / SIZE) * 100}%` }}>
          <strong>{hovered.name}</strong> <span className="num">{hovered.score ?? "–"}</span>{" "}
          <span className="rank" style={{ color: rankColor(hovered.grade) }}>{hovered.grade}</span>
          {hovered.best_move && <div className="muted">💡 {hovered.best_move.name} (+{hovered.best_move.points})</div>}
        </div>
      )}
    </div>
  );
}
