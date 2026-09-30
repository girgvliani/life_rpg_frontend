import { useState } from "react";
import { getCharacter, getCharacterHistory, getProfile } from "../api/endpoints";
import type { CharacterDay, StatResult } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useLevel } from "../context/LevelContext";
import { LevelHero } from "../components/LevelViews";
import { RadarChart } from "../components/RadarChart";
import { Sparkline } from "../components/Sparkline";
import { Card, Loaded, Meter, PageHeader } from "../components/ui";
import { useLoad } from "../lib/load";
import { CHART_EDGE, RANKS, rankColor } from "../lib/ranks";

const HISTORY_DAYS = 30;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function CharacterPage() {
  const { user } = useAuth();
  const level = useLevel();
  const sheet = useLoad(async () => {
    const [character, profile] = await Promise.all([getCharacter(), getProfile().catch(() => null)]);
    return { character, name: profile?.display_name };
  });
  const history = useLoad(() => getCharacterHistory(daysAgo(HISTORY_DAYS - 1)));

  return (
    <Loaded load={sheet}>
      {({ character, name }) => (
        <div className="stack">
          <PageHeader
            title={`“${(name || user?.email.split("@")[0] || "Your character").toUpperCase()}”`}
            subtitle={character.date}
            action={<button className="ghost" onClick={() => { sheet.reload(); history.reload(); level.refresh(); }}>↻ Refresh</button>}
          />

          {level.level && <LevelHero level={level.level} />}

          <div className="grid split-left">
            <Card>
              <RadarChart stats={character.stats} />
            </Card>
            <div className="stack">
              <Card title="Total">
                <div className="row spread">
                  <span className="num" style={{ fontSize: "3.2rem", fontWeight: 800, lineHeight: 1 }}>{character.overall ?? "–"}</span>
                  <span className="rank" style={{ fontSize: "3.6rem", lineHeight: 1, color: rankColor(character.overall_grade) }}>
                    {character.overall_grade ?? "–"}
                  </span>
                </div>
                <span className="muted small">Average of the stats that have data</span>
              </Card>
              <Card title="Ranks">
                {RANKS.filter((r) => r.min < CHART_EDGE).map((r) => (
                  <div key={r.letter} className="row" style={{ gap: "1rem" }}>
                    <span className="rank" style={{ width: 28, color: rankColor(r.letter) }}>{r.letter}</span>
                    <span className="muted num small">{r.min}–{r.max}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>

          <div className="section-title">Stats · click for the breakdown</div>
          <div className="grid grid-2">
            {character.stats.map((stat) => <StatRow key={stat.code} stat={stat} />)}
          </div>

          <div className="section-title">Last {HISTORY_DAYS} days</div>
          {history.data ? (
            <div className="grid grid-3">
              {character.stats.map((stat) => <Trend key={stat.code} stat={stat} days={history.data!} />)}
            </div>
          ) : (
            <p className="muted small">{history.error ?? "Loading history…"}</p>
          )}
        </div>
      )}
    </Loaded>
  );
}

function StatRow({ stat }: { stat: StatResult }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="stat-row">
      <button className="link" style={{ textAlign: "left", padding: 0, color: "inherit" }} onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="row">
          <span className="chip" style={{ minWidth: 48, justifyContent: "center" }}>{stat.code}</span>
          <strong className="grow">{stat.name}</strong>
          <span className="num" style={{ fontSize: "1.3rem", fontWeight: 800 }}>{stat.score ?? "–"}</span>
          <span className="rank" style={{ width: 34, color: rankColor(stat.grade) }}>{stat.grade ?? ""}</span>
        </div>
      </button>
      <Meter value={stat.score ?? 0} max={100} tick={CHART_EDGE} />
      {stat.score === null ? (
        <span className="muted small">{stat.components[0]?.note ?? "No data yet"}</span>
      ) : (
        !open && stat.best_move && <span className="muted small">💡 {stat.best_move.name} (up to +{stat.best_move.points})</span>
      )}
      {open && (
        <div className="stack" style={{ gap: "0.35rem" }}>
          {stat.components.map((c) => (
            <div key={c.name}>
              <div className="row spread small">
                <span>{c.name}</span>
                <span className="num">{c.score === null ? "—" : `${(c.score * c.weight).toFixed(1)} / ${c.weight}`}</span>
              </div>
              <div className="muted small">{c.note}</div>
            </div>
          ))}
          {stat.penalties.map((p) => (
            <div key={p.name} className="row spread small" style={{ color: "var(--bad)" }}>
              <span>⚠ {p.name} · {p.note}</span>
              <span className="num">−{p.points}</span>
            </div>
          ))}
          {stat.ceiling !== null && <span className="muted small">🔒 Max {stat.ceiling} today ({stat.ceiling_note})</span>}
          {stat.confidence < 100 && <span className="muted small">{100 - stat.confidence}% of this stat has no data yet</span>}
          {stat.best_move && <span className="small" style={{ color: "var(--accent)" }}>💡 Biggest gain: {stat.best_move.name} (up to +{stat.best_move.points})</span>}
        </div>
      )}
    </Card>
  );
}

function Trend({ stat, days }: { stat: StatResult; days: CharacterDay[] }) {
  const points = days.map((d) => ({ date: d.date, value: d.scores[stat.code] ?? null }));
  const known = points.filter((p) => p.value !== null);
  const first = known[0]?.value ?? null;
  const change = first !== null && stat.score !== null ? stat.score - first : null;
  return (
    <Card>
      <div className="row spread">
        <span className="section-title">{stat.name}</span>
        <span className="num small">
          <strong>{stat.score ?? "–"}</strong>
          {change !== null && change !== 0 && (
            <span style={{ color: change > 0 ? "var(--good)" : "var(--bad)" }}> {change > 0 ? "▲" : "▼"}{Math.abs(change)}</span>
          )}
        </span>
      </div>
      {known.length ? <Sparkline points={points} label={stat.name} /> : <span className="muted small">No history yet</span>}
    </Card>
  );
}
