import { useState, type FormEvent } from "react";
import { createGoal, deleteGoal, getGoals, updateGoal } from "../api/endpoints";
import type { Goal, GoalType } from "../api/types";
import { Card, Loaded, Meter, PageHeader } from "../components/ui";
import { useLevel } from "../context/LevelContext";
import { errorText, useLoad } from "../lib/load";

const TYPES: [GoalType, string][] = [
  ["weight", "⚖️ Weight"],
  ["max_pushups", "💪 Max push-ups"],
  ["steps", "👟 Steps"],
  ["sleep", "😴 Sleep"],
  ["income", "💰 Income"],
  ["custom", "✨ Custom"],
];

/** What each Goggins level does on the phone */
function goggins(level: number) {
  if (level <= 3) return "casual";
  if (level <= 6) return "committed";
  if (level === 7) return "serious";
  if (level === 8) return "phone warns you once when you open a distracting app";
  if (level === 9) return "phone warns you every 2 minutes in a distracting app";
  return "relentless: a warning every 20 seconds until you leave the app";
}

const hot = (level: number) => (level >= 8 ? "var(--bad)" : level >= 6 ? "#fb923c" : "var(--text-muted)");

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function GoalsPage() {
  const { refresh: refreshLevel } = useLevel();
  const loaded = useLoad(getGoals);
  // A reached goal is +250 XP, so every change refreshes the level too
  const goals = { ...loaded, reload: () => { loaded.reload(); refreshLevel(); } };
  return (
    <div className="stack">
      <PageHeader title="GOALS" subtitle="Losing and gaining use the same progress: start → target" />
      <div className="grid split-left">
        <Loaded load={goals}>
          {(list) => (
            <div className="stack">
              {list.length === 0 && <Card><span className="muted">No goals yet. Add one on the right.</span></Card>}
              {list.map((goal) => <GoalCard key={goal.id} goal={goal} onChanged={goals.reload} />)}
            </div>
          )}
        </Loaded>
        <NewGoal onCreated={goals.reload} />
      </div>
    </div>
  );
}

function GoalCard({ goal, onChanged }: { goal: Goal; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const progress = goal.progress ?? 0;

  async function change(body: Record<string, unknown>) {
    setError(null);
    try {
      await updateGoal(goal.id, body);
      onChanged();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${goal.title}"?`)) return;
    await deleteGoal(goal.id);
    onChanged();
  }

  return (
    <Card>
      <div className="row spread">
        <strong>{goal.title}</strong>
        <span aria-label={goal.direction} style={{ color: goal.achieved ? "var(--good)" : "var(--accent)", fontWeight: 800 }}>
          {goal.direction === "decrease" ? "↓" : "↑"}
        </span>
      </div>
      <Meter value={progress} tone={goal.achieved ? "good" : undefined} />
      <div className="row spread small">
        <span className="muted">{goal.current_value !== null ? `Now ${fmt(goal.current_value)} ${goal.unit}` : "Nothing logged yet"}</span>
        <strong style={{ color: goal.achieved ? "var(--good)" : "var(--accent)" }}>
          {goal.achieved ? "🏆 Reached" : `${Math.round(progress * 100)}% · target ${fmt(goal.target_value)}`}
        </strong>
      </div>
      {goal.deadline && <span className="muted small">Deadline {goal.deadline}</span>}
      <div className="row">
        <div className="grow">
          <div className="small" style={{ color: hot(goal.intensity), fontWeight: 700 }}>🔥 Goggins scale {goal.intensity}/10</div>
          <div className="muted small">{goggins(goal.intensity)}</div>
        </div>
        <button className="ghost" aria-label="Lower" disabled={goal.intensity <= 1} onClick={() => change({ intensity: goal.intensity - 1 })}>−</button>
        <button className="ghost" aria-label="Raise" disabled={goal.intensity >= 10} onClick={() => change({ intensity: goal.intensity + 1 })}>+</button>
      </div>
      <div className="row">
        {goal.type === "custom" && (
          <>
            <input placeholder="New value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: 120 }} />
            <button className="ghost" onClick={() => change({ current_value: Number(value) })} disabled={!value}>Update</button>
          </>
        )}
        <span className="grow" />
        <button className="danger" onClick={handleDelete}>Delete</button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </Card>
  );
}

function NewGoal({ onCreated }: { onCreated: () => void }) {
  const [type, setType] = useState<GoalType>("weight");
  const [target, setTarget] = useState("");
  const [start, setStart] = useState("");
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const custom = type === "custom";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const body: Record<string, unknown> = { type, target_value: Number(target), intensity };
      if (start) body.start_value = Number(start);
      if (custom) Object.assign(body, { title: title || undefined, unit: unit || undefined });
      await createGoal(body);
      setTarget("");
      setStart("");
      setTitle("");
      setUnit("");
      setIntensity(5);
      onCreated();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <Card title="New goal">
      <form className="stack" style={{ gap: "0.75rem" }} onSubmit={handleSubmit}>
        <div className="row wrap" style={{ gap: "0.4rem" }}>
          {TYPES.map(([value, label]) => (
            <button type="button" key={value} className={`chip ${type === value ? "on" : ""}`} onClick={() => setType(value)}>{label}</button>
          ))}
        </div>
        {custom && (
          <>
            <label className="field">What<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Read 20 books" /></label>
            <label className="field">Unit<input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="books" /></label>
          </>
        )}
        <label className="field">Target<input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} required /></label>
        <label className="field">
          Start
          <input inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} placeholder={custom ? "" : "empty = your latest logged value"} required={custom} />
        </label>
        <label className="field">
          <span style={{ color: hot(intensity), fontWeight: 700 }}>🔥 Goggins scale {intensity}/10</span>
          <input type="range" min={1} max={10} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} style={{ accentColor: "var(--accent)" }} />
          <span className="hint">{goggins(intensity)}</span>
        </label>
        <button type="submit">Create goal</button>
        {error && <p className="form-error">{error}</p>}
      </form>
    </Card>
  );
}
