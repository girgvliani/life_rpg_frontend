import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLevel } from "../context/LevelContext";
import { LevelCard } from "./LevelViews";

const NAV = [
  { to: "/", icon: "⚔️", label: "Character" },
  { to: "/streaks", icon: "🔥", label: "Streaks" },
  { to: "/check-in", icon: "📝", label: "Check-in" },
  { to: "/meals", icon: "🍽️", label: "Meals" },
  { to: "/goals", icon: "🎯", label: "Goals" },
  { to: "/quests", icon: "📜", label: "Quests" },
  { to: "/questionnaire", icon: "🧭", label: "Questionnaire", desktopOnly: true },
  { to: "/about", icon: "🪪", label: "About you" },
  { to: "/settings", icon: "⚙️", label: "Settings" },
];

/** Sidebar on desktop; on phones the same links become a bottom bar. */
export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { level } = useLevel();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <nav className="sidebar" aria-label="Main">
        <div className="brand">⚔️ LIFE RPG</div>
        {level && <LevelCard level={level} />}
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""} ${"desktopOnly" in item ? "desktop-only" : ""}`}>
            <span className="nav-icon" aria-hidden>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <div className="sidebar-footer">
          <span>{user?.email}</span>
          <button className="ghost" onClick={handleLogout}>Log out</button>
        </div>
      </nav>
      <main className="page">
        {level && <div className="level-strip"><LevelCard level={level} /></div>}
        {children}
      </main>
    </div>
  );
}
