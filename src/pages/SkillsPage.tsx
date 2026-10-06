import { useState, type FormEvent } from "react";
import { createLifeArea, deleteLifeArea, getLifeAreas, renameLifeArea } from "../api/endpoints";
import type { LifeArea } from "../api/types";
import { Choice, required } from "../components/forms";
import { Card, Loaded, Meter, PageHeader } from "../components/ui";
import { useLevel } from "../context/LevelContext";
import { errorText, useLoad } from "../lib/load";
import { PROTECTED_SKILLS, XP_PER_LEVEL, skillCategory, skillShort } from "../lib/plan";

const CATEGORY_IDEAS = ["Health", "Learning", "Career", "Mind", "Creative", "Money", "Relationships"];

/** The life areas XP levels up, by category; add, rename or delete them. */
export function SkillsPage() {
  const { refresh: refreshLevel } = useLevel();
  const data = useLoad(getLifeAreas);
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div className="stack">
      <PageHeader
        title="SKILLS"
        subtitle={`The areas of your life that level up. Quests give XP to one skill, milestones to all of them. ${XP_PER_LEVEL} XP per level.`}
      />
      <Loaded load={data}>
        {(skills) => {
          const reload = () => { data.reload(); refreshLevel(); };
          const categories = [...new Set(skills.map(skillCategory))].sort();
          return (
            <div className="grid split-left">
              <div className="stack">
                {skills.length === 0 && <Card><span className="muted">No skills yet. Add the areas you want to grow in.</span></Card>}
                {categories.map((category) => {
                  const items = skills.filter((s) => skillCategory(s) === category).sort((a, b) => b.xp - a.xp);
                  return (
                    <Card key={category}>
                      <div className="row spread">
                        <strong style={{ color: "var(--accent)", letterSpacing: "0.05em" }}>{category.toUpperCase()}</strong>
                        <span className="muted small">LV {items.reduce((sum, s) => sum + s.level, 0)}</span>
                      </div>
                      {items.map((s) => (
                        <div key={s.id} className="stack" style={{ gap: "0.3rem" }}>
                          <button className="link field-row-head" onClick={() => setEditing(editing === s.id ? null : s.id)} aria-expanded={editing === s.id}>
                            <div className="row spread">
                              <strong>{PROTECTED_SKILLS.has(s.name) ? "🔒 " : ""}{skillShort(s)}</strong>
                              <strong>LV {s.level}</strong>
                            </div>
                          </button>
                          <Meter value={s.xp % XP_PER_LEVEL} max={XP_PER_LEVEL} />
                          <span className="muted small">{s.xp} XP · {XP_PER_LEVEL - (s.xp % XP_PER_LEVEL)} to LV {s.level + 1}</span>
                          {editing === s.id && (
                            <SkillForm existing={s} all={skills} onSaved={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
                          )}
                        </div>
                      ))}
                    </Card>
                  );
                })}
              </div>
              <Card title="New skill"><SkillForm all={skills} onSaved={reload} /></Card>
            </div>
          );
        }}
      </Loaded>
    </div>
  );
}

function SkillForm({ existing, all, onSaved, onCancel }: { existing?: LifeArea; all: LifeArea[]; onSaved: () => void; onCancel?: () => void }) {
  const locked = existing ? PROTECTED_SKILLS.has(existing.name) : false;
  const [category, setCategory] = useState(existing && existing.name.includes(" - ") ? skillCategory(existing) : "");
  const [name, setName] = useState(existing ? skillShort(existing) : "");
  const [error, setError] = useState<string | null>(null);
  const categories = [...new Set([...all.map(skillCategory), ...CATEGORY_IDEAS])];

  if (locked) {
    return (
      <div className="edit-box">
        <span className="muted small">🔒 {existing!.name} collects habit XP (push-ups, showers, social), so it can't be renamed or deleted.</span>
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const skill = required(name, "Skill");
      const full = category.trim() ? `${category.trim()} - ${skill}` : skill;
      if (existing) await renameLifeArea(existing.id, full);
      else await createLifeArea(full);
      if (!existing) setName("");
      onSaved();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function remove() {
    if (!existing || !confirm(`Delete ${existing.name}?\n\nIts ${existing.xp} XP comes off your total, so your level can drop.`)) return;
    try {
      await deleteLifeArea(existing.id);
      onSaved();
    } catch (err) {
      setError(errorText(err));  // e.g. quests still use it
    }
  }

  return (
    <form className={`stack ${existing ? "edit-box" : ""}`} style={{ gap: "0.7rem" }} onSubmit={submit}>
      <label className="field">Category (optional)<input value={category} onChange={(e) => setCategory(e.target.value)} /></label>
      <Choice options={categories.map((c) => [c, c] as [string, string])} value={category} onChange={setCategory} />
      <label className="field">Skill<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kotlin, Guitar, Running…" /></label>
      <div className="row wrap">
        <button type="submit">{existing ? "Save" : "Create skill"}</button>
        {onCancel && <button type="button" className="ghost" onClick={onCancel}>Cancel</button>}
        {existing && <button type="button" className="danger" onClick={remove}>Delete</button>}
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
