import { useState } from "react";
import { CHART_EDGE, rankColor } from "../lib/ranks";

const SIZE = 400;
const CENTER = SIZE / 2;
const OUTER = 192;
const GRID = [40, 60, 70, CHART_EDGE]; // D, B and A- thresholds, then the A edge

/** One corner: what it's called (and an icon above the name), its score and rank, and a hover line. */
export interface RadarPoint {
  key: string;
  label: string;
  name: string;
  icon?: string;
  score: number | null;
  grade: string | null;
  hint?: string;
}

/**
 * Where things sit, as fractions of the outer radius: the A edge (score 85), the rank badges, the ring
 * between them and the label band, and the labels. Long names need a wider band.
 */
export interface RadarLayout {
  edge: number;
  badges: number;
  ring: number;
  labels: number;
}

/** Stat codes: short labels, so the score area gets the room */
export const CODE_LAYOUT: RadarLayout = { edge: 0.46, badges: 0.7, ring: 0.8, labels: 0.9 };
/** Category names: badges pulled in so names like DISCIPLINE fit beside them */
export const NAME_LAYOUT: RadarLayout = { edge: 0.34, badges: 0.52, ring: 0.68, labels: 0.85 };

/**
 * The character as one shape: a corner per point, rank badges on the inner ring, names in the outer
 * band. One series, one color; the names are always printed, so color never carries identity.
 * Clicking (or Enter on) a corner calls onSelect.
 */
export function RadarChart({
  points,
  layout = CODE_LAYOUT,
  onSelect,
}: {
  points: RadarPoint[];
  layout?: RadarLayout;
  onSelect?: (point: RadarPoint) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const edge = OUTER * layout.edge;
  const n = points.length;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const point = (i: number, r: number): [number, number] => [CENTER + r * Math.cos(angle(i)), CENTER + r * Math.sin(angle(i))];
  const polygon = (radius: (i: number) => number) => points.map((_, i) => point(i, radius(i)).join(",")).join(" ");
  const radiusOf = (i: number) => (edge * Math.min(100, Math.max(0, points[i].score ?? 0))) / CHART_EDGE;
  const hovered = hover !== null ? points[hover] : null;
  const [tipX, tipY] = hover !== null ? point(hover, radiusOf(hover)) : [0, 0];

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Chart: ${points.map((p) => `${p.name} ${p.score ?? "no data"}`).join(", ")}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        {/* Card rings: an outer band for the names, an inner ring carrying the badges */}
        <circle cx={CENTER} cy={CENTER} r={OUTER} fill="rgba(33,30,61,0.35)" stroke="var(--outline)" strokeWidth={2} />
        <circle cx={CENTER} cy={CENTER} r={OUTER * layout.ring} fill="var(--bg)" stroke="var(--outline)" strokeWidth={1.5} />
        <circle cx={CENTER} cy={CENTER} r={OUTER * layout.badges} fill="none" stroke="var(--hairline)" strokeWidth={1} />

        <polygon points={polygon(() => edge)} fill="var(--surface)" />
        {GRID.map((level) => (
          <polygon
            key={level}
            points={polygon(() => (edge * level) / CHART_EDGE)}
            fill="none"
            stroke={level === CHART_EDGE ? "var(--outline)" : "var(--hairline)"}
            strokeWidth={level === CHART_EDGE ? 1.5 : 1}
          />
        ))}
        {points.map((_, i) => {
          const [x, y] = point(i, edge);
          return <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="var(--hairline)" strokeWidth={1} />;
        })}

        <defs>
          <radialGradient id="radar-fill">
            <stop offset="0%" stopColor="#e879f9" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.22} />
          </radialGradient>
        </defs>
        <polygon points={polygon(radiusOf)} fill="url(#radar-fill)" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />

        {points.map((p, i) => {
          const [x, y] = point(i, radiusOf(i));
          const [bx, by] = point(i, OUTER * layout.badges);
          const [lx, ly] = point(i, OUTER * layout.labels);
          const brokeOut = (p.score ?? 0) >= CHART_EDGE;
          const select = onSelect ? () => onSelect(p) : undefined;
          return (
            <g key={p.key}>
              {brokeOut && <circle cx={x} cy={y} r={11} fill="var(--gold)" opacity={0.28} />}
              <circle cx={x} cy={y} r={4.5} fill={brokeOut ? "var(--gold)" : "var(--accent)"} stroke="var(--bg)" strokeWidth={2} />
              <circle cx={bx} cy={by} r={17} fill="var(--bg)" stroke={rankColor(p.grade)} strokeWidth={2} />
              <text x={bx} y={by} textAnchor="middle" dominantBaseline="central" fill={rankColor(p.grade)}
                fontFamily="var(--font-display)" fontWeight={700} fontSize={(p.grade?.length ?? 1) > 2 ? 11 : 14}>
                {p.grade ?? "–"}
              </text>
              {p.icon ? (
                <>
                  <text x={lx} y={ly - 10} textAnchor="middle" dominantBaseline="central" fontSize={20}>{p.icon}</text>
                  <text x={lx} y={ly + 13} textAnchor="middle" dominantBaseline="central" fill="var(--text)" fontSize={11} fontWeight={800} letterSpacing={0.5}>
                    {p.label}
                  </text>
                </>
              ) : (
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill="var(--text-muted)" fontSize={13} fontWeight={700} letterSpacing={1}>
                  {p.label}
                </text>
              )}
              {/* Hit targets: the dot and the label; keyboard reachable */}
              <circle
                cx={x} cy={y} r={16} fill="transparent" tabIndex={0}
                style={{ cursor: select ? "pointer" : "default", outline: "none" }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                onClick={select}
                onKeyDown={(e) => { if (select && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); select(); } }}
              >
                <title>{`${p.name}: ${p.score ?? "no data"} ${p.grade ?? ""}`}</title>
              </circle>
              {select && (
                <circle cx={lx} cy={ly} r={30} fill="transparent" style={{ cursor: "pointer" }} onClick={select}
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              )}
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div className="chart-tooltip" style={{ left: `${(tipX / SIZE) * 100}%`, top: `${(tipY / SIZE) * 100}%` }}>
          <strong>{hovered.name}</strong> <span className="num">{hovered.score ?? "–"}</span>{" "}
          <span className="rank" style={{ color: rankColor(hovered.grade) }}>{hovered.grade}</span>
          {hovered.hint && <div className="muted">{hovered.hint}</div>}
        </div>
      )}
    </div>
  );
}
