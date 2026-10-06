import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAttempts, getCharacter, getCharacterHistory, getProfile } from "../api/endpoints";
import type { CategoryResult, CharacterDay, CharacterSheet, StatResult } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useLevel } from "../context/LevelContext";
import { LevelHero } from "../components/LevelViews";
import { NAME_LAYOUT, RadarChart, type RadarPoint } from "../components/RadarChart";
import { Sparkline } from "../components/Sparkline";
import { Card, Loaded, Meter, PageHeader } from "../components/ui";
import { categoryBlurb, categoryIcon } from "../lib/categories";
import { useLoad } from "../lib/load";
import { CHART_EDGE, RANKS, rankColor } from "../lib/ranks";
import { statColor } from "../lib/stats";

const HISTORY_DAYS = 30;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const statsOf = (sheet: CharacterSheet, category: CategoryResult) =>
  category.stats.map((code) => sheet.stats.find((s) => s.code === code)).filter((s): s is StatResult => !!s);

/** The stat a category would gain most from next */
const bestMoveIn = (stats: StatResult[]) =>
  stats.filter((s) => s.best_move).sort((a, b) => b.best_move!.points - a.best_move!.points)[0];

export function CharacterPage() {
  const { user } = useAuth();
  const level = useLevel();
  const sheet = useLoad(async () => {
    const [character, profile] = await Promise.all([getCharacter(), getProfile().catch(() => null)]);
    return { character, name: profile?.display_name };
  });
  const history = useLoad(() => getCharacterHistory(daysAgo(HISTORY_DAYS - 1)));
  const [highlight, setHighlight] = useState<string | null>(null);
  // Until the questionnaire has been taken, the Character page asks for it
  const attempts = useLoad(() => getAttempts().catch(() => null));
  const navigate = useNavigate();

  // A radar corner scrolls to its category's card and lights it up for a moment
  function openCategory(key: string) {
    document.getElementById(`category-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlight(key);
    window.setTimeout(() => setHighlight((current) => (current === key ? null : current)), 1600);
  }

  return (
    <Loaded load={sheet}>
      {({ character, name }) => {
        // A server from before the categories sends none: show the nine stats as before
        const categories = character.categories ?? [];
        const byCategory = categories.length > 0;
        const points: RadarPoint[] = byCategory
          ? categories.map((c) => {
              const best = bestMoveIn(statsOf(character, c));
              return {
                key: c.key, label: c.name.toUpperCase(), name: c.name, icon: categoryIcon(c.key), score: c.score, grade: c.grade, color: "var(--text)",
                hint: best ? `💡 ${best.best_move!.name} (+${best.best_move!.points})` : undefined,
              };
            })
          : character.stats.map((s) => ({
              key: s.code, label: s.code, name: s.name, score: s.score, grade: s.grade, color: statColor(s.code),
              hint: s.best_move ? `💡 ${s.best_move.name} (+${s.best_move.points})` : undefined,
            }));

        return (
          <div className="stack">
            <PageHeader
              title={`“${(name || user?.email.split("@")[0] || "Your character").toUpperCase()}”`}
              subtitle={character.date}
              action={<button className="ghost" onClick={() => { sheet.reload(); history.reload(); level.refresh(); }}>↻ Refresh</button>}
            />

            {attempts.data?.length === 0 && (
              <button className="questionnaire-prompt" onClick={() => navigate("/questionnaire")}>
                <strong>🧭 Take the questionnaire</strong>
                <span className="muted small">5 minutes on what matters to you and how you live now, for a plan of what to change first.</span>
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>Start ›</span>
              </button>
            )}

            {level.level && <LevelHero level={level.level} />}

            <div className="grid split-left">
              <Card>
                <RadarChart
                  points={points}
                  layout={byCategory ? NAME_LAYOUT : undefined}
                  onSelect={byCategory ? (p) => openCategory(p.key) : undefined}
                />
                {byCategory && <span className="muted small" style={{ textAlign: "center" }}>Click a category to jump to it</span>}
              </Card>
              <div className="stack">
                <Card title="Total">
                  <div className="row spread">
                    <span className="num" style={{ fontSize: "3.2rem", fontWeight: 800, lineHeight: 1 }}>{character.overall ?? "–"}</span>
                    <span className="rank" style={{ fontSize: "3.6rem", lineHeight: 1, color: rankColor(character.overall_grade) }}>
                      {character.overall_grade ?? "–"}
                    </span>
                  </div>
                  <span className="muted small">
                    {byCategory ? "Average of the categories that have data" : "Average of the stats that have data"}
                  </span>
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

            {byCategory ? (
              <>
                <div className="section-title">Categories · click a stat for its page</div>
                <div className="grid grid-2" style={{ alignItems: "start" }}>
                  {categories.map((c) => (
                    <CategoryCard key={c.key} category={c} stats={statsOf(character, c)} highlighted={highlight === c.key} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="section-title">Stats · click one for its page</div>
                <div className="grid grid-2">
                  {character.stats.map((stat) => <StatRow key={stat.code} stat={stat} />)}
                </div>
              </>
            )}

            <div className="section-title">Last {HISTORY_DAYS} days</div>
            {history.data ? (
              <div className="grid grid-3">
                {byCategory
                  ? categories.map((c) => (
                      <Trend key={c.key} title={`${categoryIcon(c.key)} ${c.name}`} score={c.score}
                        points={history.data!.map((d) => ({ date: d.date, value: d.categories?.[c.key] ?? null }))} />
                    ))
                  : character.stats.map((s) => (
                      <Trend key={s.code} title={s.name} score={s.score} points={statPoints(history.data!, s.code)} />
                    ))}
              </div>
            ) : (
              <p className="muted small">{history.error ?? "Loading history…"}</p>
            )}
          </div>
        );
      }}
    </Loaded>
  );
}

const statPoints = (days: CharacterDay[], code: string) => days.map((d) => ({ date: d.date, value: d.scores[code] ?? null }));

/** A category: its score and what it covers, then its stats (each one opens its breakdown). */
function CategoryCard({ category, stats, highlighted }: { category: CategoryResult; stats: StatResult[]; highlighted: boolean }) {
  const best = bestMoveIn(stats);
  return (
    <div id={`category-${category.key}`} className={`category-card ${highlighted ? "highlighted" : ""}`}>
      <Card>
        <div className="row">
          <span style={{ fontSize: "1.8rem" }} aria-hidden>{categoryIcon(category.key)}</span>
          <div className="grow">
            <strong style={{ fontSize: "1.15rem", letterSpacing: "0.04em" }}>{category.name.toUpperCase()}</strong>
            <div className="muted small">{categoryBlurb(category.key)}</div>
          </div>
          <span className="num" style={{ fontSize: "1.8rem", fontWeight: 800 }}>{category.score ?? "–"}</span>
          <span className="rank" style={{ width: 40, fontSize: "1.5rem", color: rankColor(category.grade) }}>{category.grade ?? ""}</span>
        </div>
        <Meter value={category.score ?? 0} max={100} tick={CHART_EDGE} />
        <span className="muted small">
          {stats.length > 1 ? `Average of ${stats.map((s) => s.name).join(", ")}` : `From ${stats[0]?.name ?? "–"}`}
          {best && <> · 💡 {best.best_move!.name} (+{best.best_move!.points})</>}
        </span>
        <div className="stack" style={{ gap: "0.6rem" }}>
          {stats.map((stat) => <StatRow key={stat.code} stat={stat} nested />)}
        </div>
      </Card>
    </div>
  );
}

/** A stat: its score and the biggest gain; opens the stat's own page */
function StatRow({ stat, nested = false }: { stat: StatResult; nested?: boolean }) {
  const navigate = useNavigate();
  const body = (
    <button className="link stat-link" onClick={() => navigate(`/stat/${stat.code}`)}>
      <div className="row">
        <span className="chip stat-code" style={{ minWidth: 48, justifyContent: "center", color: statColor(stat.code), borderColor: statColor(stat.code) }}>
          {stat.code}
        </span>
        <strong className="grow">{stat.name}</strong>
        <span className="num" style={{ fontSize: "1.3rem", fontWeight: 800 }}>{stat.score ?? "–"}</span>
        <span className="rank" style={{ width: 34, color: rankColor(stat.grade) }}>{stat.grade ?? ""}</span>
        <span style={{ color: "var(--accent)", fontWeight: 800 }} aria-hidden>›</span>
      </div>
      <Meter value={stat.score ?? 0} max={100} tick={CHART_EDGE} color={statColor(stat.code)} />
      {stat.score === null ? (
        <span className="muted small">{stat.components[0]?.note ?? "No data yet"}</span>
      ) : (
        stat.best_move && <span className="muted small">💡 {stat.best_move.name} (up to +{stat.best_move.points})</span>
      )}
    </button>
  );
  return nested ? <div className="tile stat-row">{body}</div> : <Card className="stat-row">{body}</Card>;
}

function Trend({ title, score, points }: { title: string; score: number | null; points: { date: string; value: number | null }[] }) {
  const known = points.filter((p) => p.value !== null);
  const first = known[0]?.value ?? null;
  const change = first !== null && score !== null ? score - first : null;
  return (
    <Card>
      <div className="row spread">
        <span className="section-title">{title}</span>
        <span className="num small">
          <strong>{score ?? "–"}</strong>
          {change !== null && change !== 0 && (
            <span style={{ color: change > 0 ? "var(--good)" : "var(--bad)" }}> {change > 0 ? "▲" : "▼"}{Math.abs(change)}</span>
          )}
        </span>
      </div>
      {known.length ? <Sparkline points={points} label={title} /> : <span className="muted small">No history yet</span>}
    </Card>
  );
}
