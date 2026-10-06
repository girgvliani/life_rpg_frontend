import { useNavigate, useParams } from "react-router-dom";
import { getCharacter, getCharacterHistory } from "../api/endpoints";
import { Card, Loaded, Meter } from "../components/ui";
import { Sparkline } from "../components/Sparkline";
import { categoryIcon } from "../lib/categories";
import { isoDay } from "../lib/dates";
import { useLoad } from "../lib/load";
import { CHART_EDGE, rankColor } from "../lib/ranks";
import { partsOf } from "../lib/statParts";
import { statColor } from "../lib/stats";

const HISTORY_DAYS = 30;
const fmt = (n: number) => (Math.abs(n) >= 10 || Number.isInteger(n) ? Math.round(n).toString() : n.toFixed(1));

/** A stat's own page: its score split into parts, a tip for every part that isn't full, 30 days of history. */
export function StatPage() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const data = useLoad(getCharacter, [code]);
  // The history takes a few seconds to work out; the page shows without it and the trend fills in
  const history = useLoad(() => getCharacterHistory(isoDay(HISTORY_DAYS - 1)).catch(() => null), [code]);

  return (
    <Loaded load={data}>
      {(sheet) => {
        const stat = sheet.stats.find((s) => s.code === code);
        if (!stat) return <Card><span className="muted">No stat called {code}.</span></Card>;
        const category = sheet.categories?.find((c) => c.stats.includes(stat.code));
        const color = statColor(stat.code);
        const points = history.data?.map((d) => ({ date: d.date, value: d.scores[stat.code] ?? null })) ?? [];
        return (
          <div className="stack" style={{ maxWidth: 900 }}>
            <button className="ghost" style={{ alignSelf: "flex-start" }} onClick={() => navigate(-1)}>
              ← {category ? `${categoryIcon(category.key)} ${category.name}` : "Character"}
            </button>
            <Card>
              <div className="row">
                <span className="stat-badge" style={{ color, borderColor: color }}>{stat.code}</span>
                <div className="grow">
                  <h1 style={{ fontSize: "1.5rem", color: "var(--text)" }}>{stat.name.toUpperCase()}</h1>
                  <span className="muted small">{stat.confidence < 100 ? `${stat.confidence}% of this stat has data` : "Based on all its parts"}</span>
                </div>
                <span className="num" style={{ fontSize: "2.6rem", fontWeight: 800 }}>{stat.score ?? "–"}</span>
                <span className="rank" style={{ fontSize: "1.8rem", width: 56, color: rankColor(stat.grade) }}>{stat.grade ?? ""}</span>
              </div>
              <Meter value={stat.score ?? 0} max={100} tick={CHART_EDGE} color={color} />
              {stat.ceiling !== null && <span className="muted small">🔒 Max {stat.ceiling} today ({stat.ceiling_note})</span>}
              {stat.best_move && (
                <strong style={{ color: "var(--accent)" }}>💡 Biggest gain: {stat.best_move.name} (up to +{stat.best_move.points})</strong>
              )}
            </Card>

            <div className="section-title">Where the points come from</div>
            <div className="grid grid-2" style={{ alignItems: "start" }}>
              {partsOf(stat).map((group) => {
                const known = group.parts.filter((p) => p.earned !== null);
                const earned = group.parts.reduce((sum, p) => sum + (p.earned ?? 0), 0);
                const max = group.isDrain ? 0 : known.reduce((sum, p) => sum + p.max, 0);
                return (
                  <Card key={group.title}>
                    <div className="row spread">
                      <strong style={{ fontSize: "1.05rem" }}>{group.title}</strong>
                      {group.isDrain ? (
                        <strong style={{ color: "var(--bad)" }}>−{fmt(-earned)}</strong>
                      ) : known.length ? (
                        <strong className="num">{fmt(earned)} / {fmt(max)}</strong>
                      ) : (
                        <span className="muted small">no data</span>
                      )}
                    </div>
                    {!group.isDrain && known.length > 0 && <Meter value={earned} max={max} />}
                    {group.parts.map((p) => (
                      <div key={p.name} className="tile">
                        <div className="row spread small">
                          <strong>{p.name}</strong>
                          <strong className="num" style={{ color: group.isDrain ? "var(--bad)" : undefined }}>
                            {group.isDrain ? `−${fmt(p.max)}` : p.earned === null ? "—" : `${p.earned.toFixed(1)} / ${fmt(p.max)}`}
                          </strong>
                        </div>
                        {!group.isDrain && p.earned !== null && <Meter value={p.earned} max={p.max} />}
                        {p.note && <span className="muted small">{p.note}</span>}
                        {p.tip && <span className="small" style={{ color: "var(--accent)" }}>💡 {p.tip}</span>}
                      </div>
                    ))}
                  </Card>
                );
              })}
            </div>

            <div className="section-title">Last {HISTORY_DAYS} days</div>
            <Card>
              {points.some((p) => p.value !== null) ? <Sparkline points={points} label={stat.name} />
                : <span className="muted small">{history.data === null && !history.error ? "Loading history…" : "No history yet"}</span>}
            </Card>
          </div>
        );
      }}
    </Loaded>
  );
}
