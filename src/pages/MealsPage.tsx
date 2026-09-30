import { useRef, useState, type FormEvent } from "react";
import { deleteMeal, getMeals, logMeal, logMealPhoto } from "../api/endpoints";
import type { DayMeals, Meal } from "../api/types";
import { Card, Loaded, Meter, PageHeader } from "../components/ui";
import { useLevel } from "../context/LevelContext";
import { errorText, useLoad } from "../lib/load";

export function MealsPage() {
  const { refresh: refreshLevel } = useLevel();
  const loaded = useLoad(() => getMeals());
  // Meals earn XP, so every change refreshes the level too
  const meals = { ...loaded, reload: () => { loaded.reload(); refreshLevel(); } };
  const photoInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setBusy("Reading your meal…");
    setMessage(null);
    try {
      const meal = await logMealPhoto(file);
      setMessage({ ok: true, text: `✅ ${meal.name}: ${Math.round(meal.kcal)} kcal` });
      meals.reload();
    } catch (err) {
      setMessage({ ok: false, text: `❌ ${errorText(err)}` });
    } finally {
      setBusy(null);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="MEALS"
        subtitle="Snap it, the AI counts it"
        action={
          <div className="row">
            <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => handlePhoto(e.target.files?.[0])} />
            <button onClick={() => photoInput.current?.click()} disabled={busy !== null}>📷 Log a meal photo</button>
          </div>
        }
      />
      {busy && <p className="muted">{busy}</p>}
      {message && <p className={message.ok ? "form-success" : "form-error"}>{message.text}</p>}
      <Loaded load={meals}>
        {(day) => (
          <div className="grid split-right">
            <div className="stack">
              <Totals day={day} />
              <QuickAdd onAdded={meals.reload} />
            </div>
            <div className="stack">
              {day.meals.length === 0 && <Card><span className="muted">No meals logged today yet.</span></Card>}
              {day.meals.map((meal) => <MealCard key={meal.id} meal={meal} onChanged={meals.reload} />)}
            </div>
          </div>
        )}
      </Loaded>
    </div>
  );
}

function Totals({ day }: { day: DayMeals }) {
  const target = day.targets.calories;
  const left = target !== null ? target - Math.round(day.kcal) : null;
  return (
    <Card title="Today">
      <div className="row" style={{ alignItems: "baseline" }}>
        <span className="num" style={{ fontSize: "2.8rem", fontWeight: 800, lineHeight: 1 }}>{Math.round(day.kcal)}</span>
        <span className="muted">{target !== null ? `/ ${target} kcal` : "kcal"}</span>
      </div>
      {target !== null && left !== null ? (
        <>
          <Meter value={day.kcal} max={target} tone={left < 0 ? "over" : undefined} />
          <strong style={{ color: left < 0 ? "var(--bad)" : "var(--text)" }}>{left >= 0 ? `${left} kcal left` : `${-left} kcal over`}</strong>
          <span className="muted small">
            {day.targets.adjustment < 0 ? `Losing: ${day.targets.adjustment} kcal/day` : day.targets.adjustment > 0 ? `Gaining: +${day.targets.adjustment} kcal/day` : "Maintaining"}
          </span>
        </>
      ) : (
        <span className="muted small">Add your {day.targets.missing.join(", ")} in Settings (weight in Check-in) to get a calorie target.</span>
      )}
      {day.targets.protein !== null && (
        <>
          <div className="row spread small"><span>Protein</span><span className="num">{Math.round(day.protein)} / {day.targets.protein} g</span></div>
          <Meter value={day.protein} max={day.targets.protein} tone={day.protein >= day.targets.protein ? "good" : undefined} />
        </>
      )}
    </Card>
  );
}

function QuickAdd({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const title = name.trim() || "Quick add";
      await logMeal({ name: title, items: [{ name: title, kcal: Number(kcal), protein: Number(protein || 0) }] });
      setName("");
      setKcal("");
      setProtein("");
      onAdded();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <Card title="✍ Quick add">
      <form className="inline-form" onSubmit={handleSubmit}>
        <input placeholder="What" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="kcal" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} required style={{ flexBasis: 70 }} />
        <input placeholder="protein g" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} style={{ flexBasis: 90 }} />
        <button type="submit">Add</button>
      </form>
      {error && <p className="form-error">{error}</p>}
    </Card>
  );
}

function MealCard({ meal, onChanged }: { meal: Meal; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const time = meal.eaten_at.slice(11, 16);

  async function handleDelete() {
    if (!confirm(`Delete ${meal.name}?`)) return;
    await deleteMeal(meal.id);
    onChanged();
  }

  return (
    <Card>
      <button className="link" style={{ textAlign: "left", padding: 0, color: "inherit" }} onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="row">
          <div className="grow">
            <div className="muted small">{meal.source === "photo" ? "📷" : "✍"} {meal.meal_type[0].toUpperCase() + meal.meal_type.slice(1)} · {time}</div>
            <strong>{meal.name}</strong>
          </div>
          <span className="num" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{Math.round(meal.kcal)}</span>
          <span className="muted small">kcal</span>
        </div>
      </button>
      <span className="muted small num">P {Math.round(meal.protein)} g · C {Math.round(meal.carbs)} g · F {Math.round(meal.fat)} g</span>
      {open && (
        <div className="stack" style={{ gap: "0.3rem" }}>
          {meal.items.map((item, i) => (
            <div key={i} className="row spread small">
              <span>• {item.name}{item.grams ? ` (${Math.round(item.grams)} g)` : ""}</span>
              <span className="num">{Math.round(item.kcal)} kcal</span>
            </div>
          ))}
          {meal.confidence !== null && <span className="muted small">AI's confidence: {Math.round(meal.confidence * 100)}%</span>}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="danger" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      )}
    </Card>
  );
}
