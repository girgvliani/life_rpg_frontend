import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLevel } from "../context/LevelContext";
import { LevelCard } from "./LevelViews";

/**
 * Every page. `sub`: listed under Plan in the desktop sidebar; on phones the bar has no room, so Plan
 * opens them (as in the phone app). `desktopOnly`: linked from other pages on phones.
 */
const NAV: { to: string; icon: string; label: string; sub?: boolean; desktopOnly?: boolean }[] = [
  { to: "/", icon: "⚔️", label: "Character" },
  { to: "/streaks", icon: "🔥", label: "Streaks" },
  { to: "/check-in", icon: "📝", label: "Check-in" },
  { to: "/meals", icon: "🍽️", label: "Meals" },
  { to: "/plan", icon: "🗺️", label: "Plan" },
  { to: "/goals", icon: "🎯", label: "Goals", sub: true },
  { to: "/quests", icon: "📜", label: "Quests", sub: true },
  { to: "/milestones", icon: "🏔️", label: "Milestones", sub: true },
  { to: "/projects", icon: "💼", label: "Projects", sub: true },
  { to: "/skills", icon: "🌳", label: "Skills", sub: true },
  { to: "/money", icon: "💰", label: "Baby Steps", sub: true },
  { to: "/friends", icon: "👥", label: "Friends" },
  { to: "/questionnaire", icon: "🧭", label: "Questionnaire", desktopOnly: true },
  { to: "/browsing", icon: "🌐", label: "Browsing", desktopOnly: true },
  { to: "/customize", icon: "🎛️", label: "Customize", desktopOnly: true },
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
          <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""} ${item.desktopOnly || item.sub ? "desktop-only" : ""} ${item.sub ? "nav-sub" : ""}`}>
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
