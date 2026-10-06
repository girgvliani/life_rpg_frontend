import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { completeTodo, createTodo, deleteTodo, getLifeAreas, getTodos, updateTodo } from "../api/endpoints";
import type { LifeArea, Todo } from "../api/types";
import { DeadlinePicker, OpenDone, XpPicker, required, wholeNumber } from "../components/forms";
import { Card, Loaded, PageHeader } from "../components/ui";
import { useLevel } from "../context/LevelContext";
import { isoDay, longDate, relative } from "../lib/dates";
import { errorText, useLoad } from "../lib/load";
import { DUE_GROUPS, QUEST_XP, dueGroup, questXp, skillLabel } from "../lib/plan";

/** To-dos that level up a skill, grouped by when they're due; finishing on time earns 1.5x XP. */
export function QuestsPage() {
  const { refresh: refreshLevel } = useLevel();
  const navigate = useNavigate();
  const data = useLoad(async () => {
    const [todos, skills] = await Promise.all([getTodos(), getLifeAreas()]);
    return { todos, skills };
  });
  const [showDone, setShowDone] = useState(false);
  const today = isoDay();

  return (
    <div className="stack">
      <PageHeader title="QUESTS" subtitle="To-dos that level up a skill. Finish by the deadline for 1.5× XP." />
      <Loaded load={data}>
        {({ todos, skills }) => {
          const open = todos.filter((t) => !t.completed);
          const done = todos.filter((t) => t.completed);
          const reload = () => { data.reload(); refreshLevel(); };
          return (
            <div className="grid split-left">
              <div className="stack">
                <OpenDone showDone={showDone} onChange={setShowDone} open={open.length} done={done.length} />
                {showDone ? (
                  done.length === 0 ? <Card><span className="muted">Nothing finished yet.</span></Card>
                    : [...done].sort((a, b) => (b.completion_date ?? "").localeCompare(a.completion_date ?? ""))
                        .map((t) => <QuestCard key={t.id} todo={t} skills={skills} onChanged={reload} today={today} />)
                ) : open.length === 0 ? (
                  <Card><span className="muted">No open quests. Add the next thing you need to get done.</span></Card>
                ) : (
                  DUE_GROUPS.map((title, group) => {
                    const items = open.filter((t) => dueGroup(t.deadline, today) === group).sort((a, b) => a.deadline.localeCompare(b.deadline));
                    return items.length > 0 && (
                      <div key={title} className="stack" style={{ gap: "0.6rem" }}>
                        <div className="section-title">{title}</div>
                        {items.map((t) => <QuestCard key={t.id} todo={t} skills={skills} onChanged={reload} today={today} />)}
                      </div>
                    );
                  })
                )}
              </div>
              {skills.length === 0 ? (
                <Card title="New quest">
                  <span className="muted">Add a skill first: every quest levels one up.</span>
                  <button onClick={() => navigate("/skills")}>Go to Skills</button>
                </Card>
              ) : (
                <Card title="New quest"><QuestForm skills={skills} onSaved={reload} /></Card>
              )}
            </div>
          );
        }}
      </Loaded>
    </div>
  );
}

function QuestCard({ todo, skills, onChanged, today }: { todo: Todo; skills: LifeArea[]; onChanged: () => void; today: string }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skill = skills.find((s) => s.id === todo.area_id);
  const late = !todo.completed && todo.deadline < today;

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <Card>
      <div className="row spread">
        <strong style={{ textDecoration: todo.completed ? "line-through" : undefined, color: todo.completed ? "var(--text-muted)" : undefined }}>
          {todo.task}
        </strong>
        <strong style={{ color: todo.completed ? "var(--text-muted)" : "var(--good)" }}>{todo.completed ? "done" : `+${questXp(todo, today)} XP`}</strong>
      </div>
      <span className="small" style={{ color: late ? "var(--bad)" : "var(--text-muted)" }}>
        {skill ? `🌳 ${skillLabel(skill, skills)}  ·  ` : ""}
        {todo.completed ? `finished ${todo.completion_date ? longDate(todo.completion_date) : ""}` : `due ${longDate(todo.deadline)} · ${relative(todo.deadline, today)}`}
      </span>
      {editing ? (
        <QuestForm skills={skills} existing={todo} onSaved={() => { setEditing(false); onChanged(); }} onCancel={() => setEditing(false)} />
      ) : (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          {!todo.completed && <button onClick={() => run(() => completeTodo(todo.id))}>✓ Done</button>}
          {!todo.completed && <button className="ghost" onClick={() => setEditing(true)}>Edit</button>}
          <button className="danger" onClick={() => confirm(`Delete "${todo.task}"?`) && run(() => deleteTodo(todo.id))}>Delete</button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </Card>
  );
}

function QuestForm({ skills, existing, onSaved, onCancel }: { skills: LifeArea[]; existing?: Todo; onSaved: () => void; onCancel?: () => void }) {
  const [task, setTask] = useState(existing?.task ?? "");
  const [skillId, setSkillId] = useState(existing?.area_id ?? skills[0]?.id);
  const [xp, setXp] = useState(String(existing?.base_xp ?? 25));
  const [deadline, setDeadline] = useState(existing?.deadline ?? isoDay());
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const body = { task: required(task, "Quest"), area_id: skillId!, base_xp: wholeNumber(xp, "XP"), deadline: required(deadline, "Deadline") };
      if (existing) await updateTodo(existing.id, body);
      else await createTodo(body.task, body.area_id, body.base_xp, body.deadline);
      if (!existing) setTask("");
      onSaved();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <form className={`stack ${existing ? "edit-box" : ""}`} style={{ gap: "0.7rem" }} onSubmit={submit}>
      <label className="field">What needs doing?<input value={task} onChange={(e) => setTask(e.target.value)} /></label>
      <label className="field">
        Levels up
        <select value={skillId} onChange={(e) => setSkillId(Number(e.target.value))}>
          {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <div className="field">How hard?<XpPicker value={xp} onChange={setXp} presets={QUEST_XP} /></div>
      <DeadlinePicker value={deadline} onChange={setDeadline} />
      <div className="row">
        <button type="submit">{existing ? "Save" : "Create quest"}</button>
        {onCancel && <button type="button" className="ghost" onClick={onCancel}>Cancel</button>}
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
