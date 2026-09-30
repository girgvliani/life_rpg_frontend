import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/ui";
import { MilestonesPage } from "./MilestonesPage";
import { ProjectsPage } from "./ProjectsPage";
import { TodosPage } from "./TodosPage";

const TABS = [
  { key: "todos", label: "📝 Todos", page: <TodosPage /> },
  { key: "projects", label: "💼 Projects", page: <ProjectsPage /> },
  { key: "milestones", label: "🏆 Milestones", page: <MilestonesPage /> },
];

/** Todos, paid projects and epic milestones: the XP side of the game. */
export function QuestsPage() {
  const [params, setParams] = useSearchParams();
  const current = TABS.find((t) => t.key === params.get("tab")) ?? TABS[0];
  return (
    <div className="stack">
      <PageHeader
        title="QUESTS"
        subtitle="Finish early for 1.5× XP"
        action={
          <div className="row wrap">
            {TABS.map((t) => (
              <button key={t.key} className={`chip ${t === current ? "on" : ""}`} onClick={() => setParams({ tab: t.key })}>{t.label}</button>
            ))}
          </div>
        }
      />
      {current.page}
    </div>
  );
}
