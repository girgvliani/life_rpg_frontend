import { getStreaks } from "../api/endpoints";
import type { Streak } from "../api/types";
import { Card, Loaded, PageHeader } from "../components/ui";
import { useLoad } from "../lib/load";

const FACES = { happy: "😄", worried: "😟", angry: "😡", idle: "😴" };

/** At-risk streaks first (they need you today), then broken, then the rest by length */
function ordered(streaks: Streak[]) {
  return [...streaks].sort((a, b) => Number(b.at_risk) - Number(a.at_risk) || Number(b.broken_today) - Number(a.broken_today) || b.current - a.current);
}

function state(s: Streak) {
  if (s.at_risk) return { text: "⚠ dies at midnight", className: "state-risk" };
  if (s.broken_today) return { text: "✖ broken today", className: "state-broken" };
  if (s.done_today) return { text: "✓ kept today", className: "state-done" };
  return { text: "start it today", className: "muted" };
}

export function StreaksPage() {
  const streaks = useLoad(getStreaks);
  return (
    <Loaded load={streaks}>
      {(data) => (
        <div className="stack">
          <PageHeader title="STREAKS" subtitle={data.date} action={<button className="ghost" onClick={streaks.reload}>↻ Refresh</button>} />
          <div className={`mood ${data.mood}`} role="status">
            <span className="mood-face" aria-hidden>{FACES[data.mood]}</span>
            <strong style={{ fontSize: "1.1rem" }}>{data.message}</strong>
          </div>
          <div className="grid grid-auto">
            {ordered(data.streaks).map((s) => {
              const st = state(s);
              return (
                <Card key={s.key}>
                  <div className="row spread">
                    <span className="section-title">{s.emoji} {s.name}</span>
                    <span className={`small ${st.className}`}>{st.text}</span>
                  </div>
                  <div className="row" style={{ alignItems: "baseline" }}>
                    <span className="tile-value">{s.current}</span>
                    <span className="muted small">{s.current === 1 ? "day" : "days"} · best {s.best}</span>
                  </div>
                  <span className="muted small">{s.rule}</span>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </Loaded>
  );
}
