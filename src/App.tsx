import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TodosPage } from "./pages/TodosPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { MilestonesPage } from "./pages/MilestonesPage";
import { ProfilePage } from "./pages/ProfilePage";

function Protected({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <Protected>
                <DashboardPage />
              </Protected>
            }
          />
          <Route
            path="/todos"
            element={
              <Protected>
                <TodosPage />
              </Protected>
            }
          />
          <Route
            path="/projects"
            element={
              <Protected>
                <ProjectsPage />
              </Protected>
            }
          />
          <Route
            path="/milestones"
            element={
              <Protected>
                <MilestonesPage />
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected>
                <ProfilePage />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
