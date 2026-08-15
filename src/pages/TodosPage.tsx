import { useEffect, useState, type FormEvent } from "react";
import { completeTodo, createTodo, getLifeAreas, getTodos } from "../api/endpoints";
import type { LifeArea, Todo } from "../api/types";
import { ApiError } from "../api/client";

export function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [areas, setAreas] = useState<LifeArea[]>([]);
  const [task, setTask] = useState("");
  const [areaId, setAreaId] = useState<number | "">("");
  const [baseXp, setBaseXp] = useState(20);
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [todoList, areaList] = await Promise.all([getTodos(), getLifeAreas()]);
    setTodos(todoList);
    setAreas(areaList);
    if (areaList.length && areaId === "") setAreaId(areaList[0].id);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (areaId === "") return;
    try {
      await createTodo(task, areaId, baseXp, deadline);
      setTask("");
      setBaseXp(20);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create todo");
    }
  }

  async function handleComplete(id: number) {
    setError(null);
    try {
      await completeTodo(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to complete todo");
    }
  }

  const pending = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  return (
    <div className="dashboard">
      <section className="card">
        <h2>Add Todo</h2>
        <form className="inline-form" onSubmit={handleCreate}>
          <input placeholder="Task" value={task} onChange={(e) => setTask(e.target.value)} required />
          <select value={areaId} onChange={(e) => setAreaId(Number(e.target.value))}>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={baseXp}
            onChange={(e) => setBaseXp(Number(e.target.value))}
            style={{ width: 80 }}
            title="Base XP"
          />
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
          <button type="submit">Add</button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </section>

      <section className="card">
        <h2>Pending ({pending.length})</h2>
        {pending.map((t) => (
          <div key={t.id} className="milestone-row">
            <span>
              {t.task} — {t.base_xp} XP base, due {t.deadline}
            </span>
            <button onClick={() => handleComplete(t.id)}>Complete</button>
          </div>
        ))}
        {pending.length === 0 && <p>No pending todos.</p>}
      </section>

      <section className="card">
        <h2>Completed ({completed.length})</h2>
        {completed.map((t) => (
          <div key={t.id} className="milestone-row">
            <span>
              ✅ {t.task} — completed {t.completion_date}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
