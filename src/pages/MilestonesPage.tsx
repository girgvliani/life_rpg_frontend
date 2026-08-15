import { useEffect, useState } from "react";
import { completeMilestone, getMilestones } from "../api/endpoints";
import type { Milestone } from "../api/types";
import { ApiError } from "../api/client";

export function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setMilestones(await getMilestones());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleComplete(key: string) {
    setError(null);
    try {
      await completeMilestone(key);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to complete milestone");
    }
  }

  return (
    <div className="dashboard">
      <section className="card">
        <h2>🏆 Epic Milestones</h2>
        {error && <p className="form-error">{error}</p>}
        {milestones.map((m) => (
          <div key={m.key} className="milestone-row">
            <span>
              {m.completed ? "✅" : "⏳"} {m.description} (+{m.xp_reward} XP)
            </span>
            {!m.completed && <button onClick={() => handleComplete(m.key)}>Complete</button>}
          </div>
        ))}
      </section>
    </div>
  );
}
