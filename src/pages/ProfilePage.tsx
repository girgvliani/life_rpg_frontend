import { useEffect, useState } from "react";
import { getStats } from "../api/endpoints";
import type { Stats } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load profile"));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!stats) return <div className="page-loading">Loading...</div>;

  const areas = stats.life_areas;
  const areaCount = areas.length;
  const averageLevel = areas.reduce((sum, a) => sum + a.level, 0) / areaCount;
  const averageXp = areas.reduce((sum, a) => sum + a.xp, 0) / areaCount;
  const totalXp = areas.reduce((sum, a) => sum + a.xp, 0);

  const topAreas = [...areas].sort((a, b) => b.xp - a.xp).slice(0, 5);

  return (
    <div className="dashboard">
      <section className="card profile-hero">
        <h2>⚔️ Your Character</h2>
        <p className="profile-email">{user?.email}</p>
        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat-value">{averageLevel.toFixed(1)}</span>
            <span className="profile-stat-label">Average Level</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{averageXp.toFixed(1)}</span>
            <span className="profile-stat-label">Average XP</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{totalXp.toLocaleString()}</span>
            <span className="profile-stat-label">Total XP</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{areaCount}</span>
            <span className="profile-stat-label">Life Areas</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Top Areas</h2>
        {topAreas.map((a) => (
          <div key={a.id} className="milestone-row">
            <span>{a.name}</span>
            <span>
              Lv {a.level} · {a.xp} XP
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
