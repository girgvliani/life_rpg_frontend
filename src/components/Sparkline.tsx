import { useState } from "react";
import { CHART_EDGE } from "../lib/ranks";
import { useWidth } from "../lib/load";

const HEIGHT = 64;
const PAD = 6;

export interface SparkPoint {
  date: string;
  value: number | null;
}

/**
 * A stat's recent scores on a 0-100 scale, with a hairline at the A edge. Days without data leave
 * gaps. Hover or touch for a crosshair and the day's value.
 */
export function Sparkline({ points, label }: { points: SparkPoint[]; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const x = (i: number) => (points.length < 2 ? width / 2 : (i / (points.length - 1)) * width);
  const y = (v: number) => PAD + (1 - v / 100) * (HEIGHT - 2 * PAD);

  // Break the line wherever a day has no score
  const segments: string[] = [];
  let current = "";
  points.forEach((p, i) => {
    if (p.value === null) {
      if (current) segments.push(current);
      current = "";
    } else {
      current += `${current ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
    }
  });
  if (current) segments.push(current);

  const lastIndex = points.map((p) => p.value !== null).lastIndexOf(true);
  const hovered = hover !== null ? points[hover] : null;

  function track(clientX: number, rect: DOMRect) {
    if (points.length === 0) return;
    const i = Math.round(((clientX - rect.left) / rect.width) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  }

  return (
    <div className="chart-wrap" ref={ref}>
      {width > 0 && (
        <svg
          className="spark"
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${label} over the last ${points.length} days`}
          onPointerMove={(e) => track(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setHover(null)}
        >
          <line x1={0} x2={width} y1={y(CHART_EDGE)} y2={y(CHART_EDGE)} stroke="var(--hairline)" strokeWidth={1} />
          <line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke="var(--hairline)" strokeWidth={1} />
          {segments.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {lastIndex >= 0 && hover === null && (
            <circle cx={x(lastIndex)} cy={y(points[lastIndex].value!)} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
          )}
          {hovered && (
            <g>
              <line x1={x(hover!)} x2={x(hover!)} y1={0} y2={HEIGHT} stroke="var(--outline)" strokeWidth={1} />
              {hovered.value !== null && (
                <circle cx={x(hover!)} cy={y(hovered.value)} r={4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
              )}
            </g>
          )}
        </svg>
      )}
      {hovered && (
        <div className="chart-tooltip" style={{ left: x(hover!), top: hovered.value !== null ? y(hovered.value) : HEIGHT / 2 }}>
          {new Date(hovered.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
          <strong className="num">{hovered.value ?? "no data"}</strong>
        </div>
      )}
    </div>
  );
}
