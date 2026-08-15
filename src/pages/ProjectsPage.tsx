import { useEffect, useState, type FormEvent } from "react";
import { completeProject, createProject, getProjects } from "../api/endpoints";
import type { Project } from "../api/types";
import { ApiError } from "../api/client";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [value, setValue] = useState(500);
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setProjects(await getProjects());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createProject(name, value, deadline);
      setName("");
      setValue(500);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create project");
    }
  }

  async function handleComplete(id: number) {
    setError(null);
    try {
      await completeProject(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to complete project");
    }
  }

  const active = projects.filter((p) => !p.completed);
  const completed = projects.filter((p) => p.completed);

  return (
    <div className="dashboard">
      <section className="card">
        <h2>Add Project</h2>
        <form className="inline-form" onSubmit={handleCreate}>
          <input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            style={{ width: 100 }}
            title="Value (Lari)"
          />
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
          <button type="submit">Add</button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </section>

      <section className="card">
        <h2>Active ({active.length})</h2>
        {active.map((p) => (
          <div key={p.id} className="milestone-row">
            <span>
              {p.name} — {p.value.toLocaleString()} Lari, due {p.deadline}
            </span>
            <button onClick={() => handleComplete(p.id)}>Complete</button>
          </div>
        ))}
        {active.length === 0 && <p>No active projects.</p>}
      </section>

      <section className="card">
        <h2>Completed ({completed.length})</h2>
        {completed.map((p) => (
          <div key={p.id} className="milestone-row">
            <span>
              ✅ {p.name} — {p.value.toLocaleString()} Lari, completed {p.completion_date}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
