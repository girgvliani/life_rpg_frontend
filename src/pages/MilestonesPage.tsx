import { useState, type FormEvent } from "react";
import { completeMilestone, createMilestone, deleteMilestone, getMilestones, updateMilestone } from "../api/endpoints";
import type { Milestone } from "../api/types";
import { OpenDone, XpPicker, required, wholeNumber } from "../components/forms";
import { Card, Loaded, PageHeader } from "../components/ui";
import { useLevel } from "../context/LevelContext";
import { errorText, useLoad } from "../lib/load";
import { MILESTONE_IDEAS, MILESTONE_XP } from "../lib/plan";

/** Big one-off wins; completing one shares its XP out over all your skills. */
export function MilestonesPage() {
  const { refresh: refreshLevel } = useLevel();
  const data = useLoad(getMilestones);
  const [showDone, setShowDone] = useState(false);
  const [idea, setIdea] = useState<[string, number] | null>(null);

  return (
    <div className="stack">
      <PageHeader title="MILESTONES" subtitle="Big one-off wins. Completing one shares its XP out over all your skills." />
      <Loaded load={data}>
        {(list) => {
          const open = list.filter((m) => !m.completed);
          const done = list.filter((m) => m.completed);
          const shown = showDone ? done : open;
          const reload = () => { data.reload(); refreshLevel(); };
          return (
            <div className="grid split-left">
              <div className="stack">
                <OpenDone showDone={showDone} onChange={setShowDone} open={open.length} done={done.length} />
                {shown.length === 0 && (
                  <Card><span className="muted">{showDone ? "Nothing completed yet." : "No milestones yet. Pick an idea on the right, or add your own."}</span></Card>
                )}
                {shown.map((m) => <MilestoneCard key={m.key} milestone={m} onChanged={reload} />)}
              </div>
              <div className="stack">
                <Card title="Ideas">
                  <div className="row wrap" style={{ gap: "0.4rem" }}>
                    {MILESTONE_IDEAS.map((i) => (
                      <button key={i[0]} type="button" className={`chip ${idea?.[0] === i[0] ? "on" : ""}`} onClick={() => setIdea(i)}>💡 {i[0]}</button>
                    ))}
                  </div>
                </Card>
                <Card title="New milestone">
                  <MilestoneForm key={idea?.[0] ?? "blank"} start={idea ?? undefined} onSaved={() => { setIdea(null); reload(); }} />
                </Card>
              </div>
            </div>
          );
        }}
      </Loaded>
    </div>
  );
}

function MilestoneCard({ milestone, onChanged }: { milestone: Milestone; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <strong style={{ textDecoration: milestone.completed ? "line-through" : undefined, color: milestone.completed ? "var(--text-muted)" : undefined }}>
          {milestone.completed ? "✅" : "🏔️"} {milestone.description}
        </strong>
        <strong style={{ color: milestone.completed ? "var(--text-muted)" : "var(--good)" }}>+{milestone.xp_reward.toLocaleString("en-US")} XP</strong>
      </div>
      {editing ? (
        <MilestoneForm existing={milestone} onSaved={() => { setEditing(false); onChanged(); }} onCancel={() => setEditing(false)} />
      ) : (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          {!milestone.completed && (
            <button onClick={() => confirm(`Completed it?\n\n${milestone.description}\n+${milestone.xp_reward} XP, shared over your skills. This can't be undone.`)
              && run(() => completeMilestone(milestone.key))}>✓ Complete</button>
          )}
          {!milestone.completed && <button className="ghost" onClick={() => setEditing(true)}>Edit</button>}
          <button className="danger" onClick={() =>
            confirm(`Delete "${milestone.description}"?${milestone.completed ? "\n\nXP you already earned stays." : ""}`)
            && run(() => deleteMilestone(milestone.key))}>Delete</button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </Card>
  );
}

function MilestoneForm({ existing, start, onSaved, onCancel }: {
  existing?: Milestone;
  start?: [string, number];
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [description, setDescription] = useState(existing?.description ?? start?.[0] ?? "");
  const [xp, setXp] = useState(String(existing?.xp_reward ?? start?.[1] ?? 500));
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const text = required(description, "Milestone");
      const reward = wholeNumber(xp, "XP");
      if (existing) await updateMilestone(existing.key, text, reward);
      else await createMilestone(text, reward);
      onSaved();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <form className={`stack ${existing ? "edit-box" : ""}`} style={{ gap: "0.7rem" }} onSubmit={submit}>
      <label className="field">What will you achieve?<input value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <div className="field">How big is it?<XpPicker value={xp} onChange={setXp} presets={MILESTONE_XP} /></div>
      <div className="row">
        <button type="submit">{existing ? "Save" : "Create milestone"}</button>
        {onCancel && <button type="button" className="ghost" onClick={onCancel}>Cancel</button>}
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
