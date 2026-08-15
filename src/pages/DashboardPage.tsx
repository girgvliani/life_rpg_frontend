import { useEffect, useState } from "react";
import {
  completeMilestone,
  getStats,
  logScreenTime,
  logShower,
  logSleep,
  logSocialInteraction,
  logWorkout,
} from "../api/endpoints";
import type { Stats } from "../api/types";
import { XpBar } from "../components/XpBar";
import { ApiError } from "../api/client";

function groupByCategory(areas: Stats["life_areas"]) {
  const groups: Record<string, Stats["life_areas"]> = {};
  for (const area of areas) {
    const [category] = area.name.includes(" - ") ? area.name.split(" - ") : [area.name];
    (groups[category] ??= []).push(area);
  }
  return groups;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushups, setPushups] = useState(100);
  const [sleepHours, setSleepHours] = useState(8);
  const [screenHours, setScreenHours] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    try {
      setStats(await getStats());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load stats");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function run(action: () => Promise<unknown>, successMsg: string) {
    setMessage(null);
    setError(null);
    try {
      await action();
      setMessage(successMsg);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    }
  }

  if (error && !stats) return <p className="form-error">{error}</p>;
  if (!stats) return <div className="page-loading">Loading...</div>;

  const groups = groupByCategory(stats.life_areas);
  const shower = stats.habits.find((h) => h.type === "shower");
  const workout = stats.habits.find((h) => h.type === "workout");
  const incomeProgress = Math.min(stats.income.current_month_earnings / (stats.income.monthly_goal || 1), 1) * 100;

  return (
    <div className="dashboard">
      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <section className="card">
        <h2>Today's Habits</h2>
        <div className="habit-row">
          <span>
            🚿 Shower {shower?.done_today ? "✓" : ""} — streak {shower?.streak ?? 0}
          </span>
          <button onClick={() => run(logShower, "Shower logged")}>Log shower</button>
        </div>
        <div className="habit-row">
          <span>
            💪 Workout {workout?.done_today ? "✓" : ""} — streak {workout?.streak ?? 0}
          </span>
          <input
            type="number"
            min={0}
            value={pushups}
            onChange={(e) => setPushups(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <button onClick={() => run(() => logWorkout(pushups), "Workout logged")}>Log push-ups</button>
        </div>
        <div className="habit-row">
          <span>😴 Sleep</span>
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <button onClick={() => run(() => logSleep(sleepHours), "Sleep logged")}>Log sleep</button>
        </div>
        <div className="habit-row">
          <span>📱 Screen time</span>
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={screenHours}
            onChange={(e) => setScreenHours(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <button onClick={() => run(() => logScreenTime(screenHours), "Screen time logged")}>Log screen time</button>
        </div>
        <div className="habit-row">
          <span>👥 Social interaction</span>
          <button onClick={() => run(logSocialInteraction, "Social interaction logged")}>Log interaction</button>
        </div>
      </section>

      <section className="card">
        <h2>💰 Income</h2>
        <div className="xp-bar-track">
          <div className="xp-bar-fill income-fill" style={{ width: `${incomeProgress}%` }} />
        </div>
        <p>
          {stats.income.current_month_earnings.toLocaleString()} / {stats.income.monthly_goal.toLocaleString()} Lari
        </p>
      </section>

      <section className="card">
        <h2>🏆 Epic Milestones</h2>
        {stats.milestones.map((m) => (
          <div key={m.key} className="milestone-row">
            <span>
              {m.completed ? "✅" : "⏳"} {m.description} (+{m.xp_reward} XP)
            </span>
            {!m.completed && (
              <button onClick={() => run(() => completeMilestone(m.key), `Milestone completed: ${m.description}`)}>
                Complete
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="card">
        <h2>📚 Life Areas</h2>
        {Object.entries(groups).map(([category, areas]) => (
          <div key={category} className="area-group">
            <h3>{category}</h3>
            {areas.map((area) => {
              const shortName = area.name.includes(" - ") ? area.name.split(" - ").slice(1).join(" - ") : area.name;
              return (
                <div key={area.id} className="area-row">
                  <span className="area-name">{shortName}</span>
                  <XpBar level={area.level} xp={area.xp} />
                </div>
              );
            })}
          </div>
        ))}
      </section>
    </div>
  );
}
