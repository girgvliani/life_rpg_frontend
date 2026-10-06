import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LevelProvider } from "./context/LevelContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AboutPage } from "./pages/AboutPage";
import { BrowsingPage } from "./pages/BrowsingPage";
import { CustomizePage } from "./pages/CustomizePage";
import { FriendsPage } from "./pages/FriendsPage";
import { QuestionnairePage } from "./pages/QuestionnairePage";
import { CharacterPage } from "./pages/CharacterPage";
import { CheckInPage } from "./pages/CheckInPage";
import { GoalsPage } from "./pages/GoalsPage";
import { MealsPage } from "./pages/MealsPage";
import { MilestonesPage } from "./pages/MilestonesPage";
import { PlanPage } from "./pages/PlanPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { QuestsPage } from "./pages/QuestsPage";
import { SkillsPage } from "./pages/SkillsPage";
import { StatPage } from "./pages/StatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StreaksPage } from "./pages/StreaksPage";

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
        <LevelProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Protected><CharacterPage /></Protected>} />
            <Route path="/streaks" element={<Protected><StreaksPage /></Protected>} />
            <Route path="/check-in" element={<Protected><CheckInPage /></Protected>} />
            <Route path="/meals" element={<Protected><MealsPage /></Protected>} />
            <Route path="/goals" element={<Protected><GoalsPage /></Protected>} />
            <Route path="/plan" element={<Protected><PlanPage /></Protected>} />
            <Route path="/quests" element={<Protected><QuestsPage /></Protected>} />
            <Route path="/milestones" element={<Protected><MilestonesPage /></Protected>} />
            <Route path="/projects" element={<Protected><ProjectsPage /></Protected>} />
            <Route path="/skills" element={<Protected><SkillsPage /></Protected>} />
            <Route path="/stat/:code" element={<Protected><StatPage /></Protected>} />
            <Route path="/about" element={<Protected><AboutPage /></Protected>} />
            <Route path="/questionnaire" element={<Protected><QuestionnairePage /></Protected>} />
            <Route path="/friends" element={<Protected><FriendsPage /></Protected>} />
            <Route path="/browsing" element={<Protected><BrowsingPage /></Protected>} />
            <Route path="/customize" element={<Protected><CustomizePage /></Protected>} />
            <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
            {/* Old addresses */}
            <Route path="/todos" element={<Navigate to="/quests" replace />} />
            <Route path="/profile" element={<Navigate to="/settings" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LevelProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
