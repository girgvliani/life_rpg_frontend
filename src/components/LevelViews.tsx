import { useState } from "react";
import type { Level } from "../api/types";
import { useWidth } from "../lib/load";
import { Meter } from "./ui";

const progressOf = (l: Level) => Math.max(0, Math.min(1, (l.xp - l.level_start_xp) / (l.next_level_xp - l.level_start_xp)));

/** Top of the sidebar on desktop; a strip across the top on phones. */
export function LevelCard({ level }: { level: Level }) {
  return (
    <div className="level-card">
      <div className="lv-badge">
        <span>LV</span>
        <strong>{level.level}</strong>
      </div>
      <div className="grow">
        <div className="row spread">
          <span className="level-title">{level.title.toUpperCase()}</span>
          {level.today_xp > 0 && <span className="xp-today num">+{level.today_xp}</span>}
        </div>
        <Meter value={progressOf(level)} />
        <div className="muted num" style={{ fontSize: "0.7rem", marginTop: 3 }}>
          {level.xp.toLocaleString()} / {level.next_level_xp.toLocaleString()} XP
        </div>
      </div>
    </div>
  );
}

/** The Character page's headline: XP ring around the level, today's XP, XP per day, sources. */
export function LevelHero({ level }: { level: Level }) {
  const progress = progressOf(level);
  const R = 62;
  const circumference = 2 * Math.PI * R;
  return (
    <section className="card level-hero">
      <div className="row wrap" style={{ gap: "1.5rem" }}>
        <svg viewBox="0 0 150 150" width={150} height={150} role="img" aria-label={`Level ${level.level}, ${Math.round(progress * 100)}% to the next`}>
          <defs>
            <linearGradient id="xp-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e879f9" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <circle cx={75} cy={75} r={R} fill="none" stroke="var(--surface-high)" strokeWidth={12} />
          <circle
            cx={75} cy={75} r={R} fill="none" stroke="url(#xp-ring)" strokeWidth={12} strokeLinecap="round"
            strokeDasharray={`${circumference * progress} ${circumference}`} transform="rotate(-90 75 75)"
          />
          <text x={75} y={58} textAnchor="middle" fill="var(--text-muted)" fontSize={11} fontWeight={800} letterSpacing={2}>LEVEL</text>
          <text x={75} y={98} textAnchor="middle" fill="var(--text)" fontSize={46} fontWeight={800}>{level.level}</text>
        </svg>
        <div className="grow stack" style={{ gap: "0.3rem" }}>
          <h2 className="hero-title">{level.title.toUpperCase()}</h2>
          <span className="num" style={{ fontSize: "1.5rem", fontWeight: 800 }}>{level.xp.toLocaleString()} XP</span>
          <span className="muted num">{(level.next_level_xp - level.xp).toLocaleString()} XP to LV {level.level + 1}</span>
          {level.next_title && <span className="muted small">Next title: {level.next_title}</span>}
        </div>
        <div className="grid grid-3 level-sources">
          {[["activity", "Activity"], ["quests", "Quests"], ["goals", "Goals"]].map(([key, label]) => (
            <div key={key} className="tile">
              <span className="section-title">{label}</span>
              <span className="num" style={{ fontSize: "1.2rem", fontWeight: 800 }}>{(level.sources[key] ?? 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <span className="section-title">{level.today_xp > 0 ? `Today · +${level.today_xp} XP` : "Today · nothing earned yet"}</span>
      {level.today.length ? (
        <div className="row wrap" style={{ gap: "0.4rem" }}>
          {level.today.map((item) => (
            <span key={item.reason} className="chip on">{item.reason} <strong className="num">+{item.xp}</strong></span>
          ))}
        </div>
      ) : (
        <span className="muted small">Check in, hit your targets and log meals to earn XP.</span>
      )}

      {level.history.some((d) => d.xp > 0) && (
        <>
          <span className="section-title">XP per day · last {level.history.length} days</span>
          <XpBars days={level.history} />
        </>
      )}
    </section>
  );
}

const BARS_HEIGHT = 80;

/** One bar per day (single series, one color; today brightest). Hover a bar for its day and XP. */
function XpBars({ days }: { days: Level["history"] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.xp));
  const gap = 2;
  const barWidth = width ? (width - gap * (days.length - 1)) / days.length : 0;
  const hovered = hover !== null ? days[hover] : null;
  return (
    <div className="chart-wrap" ref={ref}>
      {width > 0 && (
        <svg width={width} height={BARS_HEIGHT} role="img" aria-label="XP earned per day" onPointerLeave={() => setHover(null)} style={{ display: "block" }}>
          <line x1={0} x2={width} y1={BARS_HEIGHT - 0.5} y2={BARS_HEIGHT - 0.5} stroke="var(--hairline)" />
          {days.map((d, i) => {
            const h = d.xp > 0 ? Math.max(3, (BARS_HEIGHT * d.xp) / max) : 0;
            const x = i * (barWidth + gap);
            return (
              <g key={d.date} onPointerEnter={() => setHover(i)}>
                {/* Hit target: the full column, not just the bar */}
                <rect x={x} y={0} width={barWidth + gap} height={BARS_HEIGHT} fill="transparent" />
                <rect
                  x={x} y={BARS_HEIGHT - h} width={barWidth} height={h} rx={Math.min(4, barWidth / 2)}
                  fill="var(--accent)" opacity={i === days.length - 1 || i === hover ? 1 : 0.55}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hovered && (
        <div className="chart-tooltip" style={{ left: hover! * (barWidth + gap) + barWidth / 2, top: BARS_HEIGHT - Math.max(3, (BARS_HEIGHT * hovered.xp) / max) }}>
          {new Date(hovered.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ·{" "}
          <strong className="num">{hovered.xp} XP</strong>
        </div>
      )}
    </div>
  );
}
