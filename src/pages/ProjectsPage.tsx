import { useState, type FormEvent } from "react";
import { completeProject, createProject, deleteProject, getProfile, getProjects, updateProject } from "../api/endpoints";
import type { Project } from "../api/types";
import { DeadlinePicker, OpenDone, required, wholeNumber } from "../components/forms";
import { Card, Loaded, PageHeader } from "../components/ui";
import { useLevel } from "../context/LevelContext";
import { isoDay, longDate, relative } from "../lib/dates";
import { errorText, useLoad } from "../lib/load";

const money = (value: number, currency: string) => `${value.toLocaleString("en-US")} ${currency}`;

/** Paid work: completing one adds its value to this month's income (Wealth) and gives Work Skills XP. */
export function ProjectsPage() {
  const { refresh: refreshLevel } = useLevel();
  const data = useLoad(async () => {
    const [projects, profile] = await Promise.all([getProjects(), getProfile()]);
    return { projects, currency: profile.currency };
  });
  const [showDone, setShowDone] = useState(false);

  return (
    <Loaded load={data}>
      {({ projects, currency }) => {
        const open = projects.filter((p) => !p.completed).sort((a, b) => a.deadline.localeCompare(b.deadline));
        const done = projects.filter((p) => p.completed).sort((a, b) => (b.completion_date ?? "").localeCompare(a.completion_date ?? ""));
        const shown = showDone ? done : open;
        const reload = () => { data.reload(); refreshLevel(); };
        return (
          <div className="stack">
            <PageHeader
              title="PROJECTS"
              subtitle={`Paid work. Completing one adds its value to this month's income (Wealth) and gives Work Skills XP: 1 per 10 ${currency}, 1.5× on time.`}
            />
            <div className="grid split-left">
              <div className="stack">
                <OpenDone showDone={showDone} onChange={setShowDone} open={open.length} done={done.length} />
                {shown.length === 0 && <Card><span className="muted">{showDone ? "Nothing completed yet." : "No open projects."}</span></Card>}
                {shown.map((p) => <ProjectCard key={p.id} project={p} currency={currency} onChanged={reload} />)}
              </div>
              <Card title="New project"><ProjectForm currency={currency} onSaved={reload} /></Card>
            </div>
          </div>
        );
      }}
    </Loaded>
  );
}

function ProjectCard({ project, currency, onChanged }: { project: Project; currency: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const late = !project.completed && project.deadline < isoDay();

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
        <strong style={{ textDecoration: project.completed ? "line-through" : undefined, color: project.completed ? "var(--text-muted)" : undefined }}>
          {project.name}
        </strong>
        <strong style={{ color: project.completed ? "var(--text-muted)" : "var(--good)" }}>{money(project.value, currency)}</strong>
      </div>
      <span className="small" style={{ color: late ? "var(--bad)" : "var(--text-muted)" }}>
        {project.completed
          ? `Paid · finished ${project.completion_date ? longDate(project.completion_date) : ""}`
          : `Due ${longDate(project.deadline)} · ${relative(project.deadline)}`}
      </span>
      {editing ? (
        <ProjectForm currency={currency} existing={project} onSaved={() => { setEditing(false); onChanged(); }} onCancel={() => setEditing(false)} />
      ) : (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          {!project.completed && (
            <button onClick={() => confirm(`Finished and paid?\n\n${project.name}\nAdds ${money(project.value, currency)} to this month's earnings.`)
              && run(() => completeProject(project.id))}>✓ Complete</button>
          )}
          {!project.completed && <button className="ghost" onClick={() => setEditing(true)}>Edit</button>}
          <button className="danger" onClick={() =>
            confirm(`Delete "${project.name}"?${project.completed ? "\n\nIts value comes off this month's earnings; XP stays." : ""}`)
            && run(() => deleteProject(project.id))}>Delete</button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </Card>
  );
}

function ProjectForm({ currency, existing, onSaved, onCancel }: { currency: string; existing?: Project; onSaved: () => void; onCancel?: () => void }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [value, setValue] = useState(existing ? String(existing.value) : "");
  const [deadline, setDeadline] = useState(existing?.deadline ?? isoDay(-7));
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const amount = wholeNumber(value, "Value");
      if (amount <= 0) throw new Error("Value: more than 0");
      const body = { name: required(name, "Name"), value: amount, deadline: required(deadline, "Deadline") };
      if (existing) await updateProject(existing.id, body);
      else await createProject(body.name, body.value, body.deadline);
      if (!existing) { setName(""); setValue(""); }
      onSaved();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <form className={`stack ${existing ? "edit-box" : ""}`} style={{ gap: "0.7rem" }} onSubmit={submit}>
      <label className="field">Project / client<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="field">What it pays ({currency})<input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} /></label>
      <DeadlinePicker value={deadline} onChange={setDeadline} />
      <div className="row">
        <button type="submit">{existing ? "Save" : "Create project"}</button>
        {onCancel && <button type="button" className="ghost" onClick={onCancel}>Cancel</button>}
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
