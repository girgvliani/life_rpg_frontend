import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <nav className="navbar">
        <span className="brand">⚔️ Life RPG</span>
        <div className="nav-links">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/todos">Todos</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/milestones">Milestones</NavLink>
        </div>
        <div className="nav-user">
          <span>{user?.email}</span>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </nav>
      <main className="page">{children}</main>
    </div>
  );
}
