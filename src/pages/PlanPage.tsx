import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { getBabySteps, getGoals, getLifeAreas, getMilestones, getProjects, getTodos } from "../api/endpoints";
import { Card, Loaded, Meter, PageHeader } from "../components/ui";
import { isoDay, relative } from "../lib/dates";
import { useLoad } from "../lib/load";
import type { BabySteps } from "../api/types";
import { GOAL_PRESETS, MILESTONE_IDEAS, XP_PER_LEVEL, questXp } from "../lib/plan";

/** One page with everything you're working toward; each card opens its full page. */
export function PlanPage() {
  const data = useLoad(async () => {
    const [goals, milestones, todos, projects, skills, babySteps] = await Promise.all([
      getGoals(), getMilestones(), getTodos(), getProjects(), getLifeAreas(), getBabySteps().catch(() => null),
    ]);
    return { goals, milestones, todos, projects, skills, babySteps };
  });
  const today = isoDay();

  return (
    <div className="stack">
      <PageHeader title="PLAN" subtitle="Everything you're working toward. Click a card to manage it." />
      <Loaded load={data}>
        {({ goals, milestones, todos, projects, skills, babySteps }) => {
          const activeGoals = goals.filter((g) => !g.achieved);
          const openTodos = todos.filter((t) => !t.completed);
          const overdue = openTodos.filter((t) => t.deadline < today).length;
          const dueToday = openTodos.filter((t) => t.deadline === today).length;
          const openMilestones = milestones.filter((m) => !m.completed);
          const openProjects = projects.filter((p) => !p.completed);
          return (
            <div className="grid grid-2" style={{ alignItems: "start" }}>
              <PlanCard icon="🎯" title="Goals" to="/goals" summary={`${activeGoals.length} active · ${goals.length - activeGoals.length} reached`}>
                {[...activeGoals].sort((a, b) => b.intensity - a.intensity).slice(0, 3).map((g) => (
                  <div key={g.id} className="stack" style={{ gap: "0.25rem" }}>
                    <Preview text={g.title} value={`${Math.round((g.progress ?? 0) * 100)}%`} />
                    <Meter value={g.progress ?? 0} />
                  </div>
                ))}
                {goals.length === 0 && <Ideas items={GOAL_PRESETS.map((p) => p.label)} />}
              </PlanCard>
              <PlanCard icon="📜" title="Quests" to="/quests"
                summary={[`${openTodos.length} open`, dueToday ? `${dueToday} due today` : "", overdue ? `⚠️ ${overdue} overdue` : ""].filter(Boolean).join(" · ")}>
                {[...openTodos].sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3).map((t) => (
                  <Preview key={t.id} text={t.task} value={`+${questXp(t, today)} XP · ${relative(t.deadline, today)}`} />
                ))}
              </PlanCard>
              <PlanCard icon="🏔️" title="Milestones" to="/milestones" summary={`${openMilestones.length} open · ${milestones.length - openMilestones.length} done`}>
                {[...openMilestones].sort((a, b) => b.xp_reward - a.xp_reward).slice(0, 3).map((m) => (
                  <Preview key={m.key} text={m.description} value={`+${m.xp_reward.toLocaleString("en-US")} XP`} />
                ))}
                {milestones.length === 0 && <Ideas items={MILESTONE_IDEAS.map(([idea]) => `💡 ${idea}`)} />}
              </PlanCard>
              <PlanCard icon="💼" title="Projects" to="/projects" summary={`${openProjects.length} open`}>
                {[...openProjects].sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3).map((p) => (
                  <Preview key={p.id} text={p.name} value={relative(p.deadline, today)} />
                ))}
              </PlanCard>
              <PlanCard icon="🌳" title="Skills" to="/skills" summary={`${skills.length} skills · LV ${skills.reduce((sum, s) => sum + s.level, 0)} combined`}>
                {[...skills].sort((a, b) => b.xp - a.xp).slice(0, 3).map((s) => (
                  <div key={s.id} className="stack" style={{ gap: "0.25rem" }}>
                    <Preview text={s.name} value={`LV ${s.level}`} />
                    <Meter value={s.xp % XP_PER_LEVEL} max={XP_PER_LEVEL} color="var(--accent-deep)" />
                  </div>
                ))}
              </PlanCard>
              <PlanCard icon="💰" title="Baby Steps" to="/money" summary={babyStepsSummary(babySteps)}>
                {babySteps?.steps.filter((s) => s.current).map((s) => (
                  <div key={s.step} className="stack" style={{ gap: "0.25rem" }}>
                    <Preview text={s.title} value={s.note} />
                    {s.progress !== "n/a" && <Meter value={s.progress ?? 0} />}
                  </div>
                ))}
              </PlanCard>
            </div>
          );
        }}
      </Loaded>
    </div>
  );
}

function PlanCard({ icon, title, to, summary, children }: { icon: string; title: string; to: string; summary: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <button className="plan-card" onClick={() => navigate(to)}>
      <Card>
        <div className="row">
          <span style={{ fontSize: "1.6rem" }} aria-hidden>{icon}</span>
          <div className="grow">
            <strong style={{ fontSize: "1.1rem", letterSpacing: "0.05em" }}>{title.toUpperCase()}</strong>
            <div className="muted small">{summary}</div>
          </div>
          <strong style={{ color: "var(--accent)", fontSize: "1.5rem" }} aria-hidden>›</strong>
        </div>
        {children}
      </Card>
    </button>
  );
}

function Preview({ text, value }: { text: string; value: string }) {
  return (
    <div className="row spread small">
      <span className="ellipsis">{text}</span>
      <strong className="muted" style={{ whiteSpace: "nowrap" }}>{value}</strong>
    </div>
  );
}

/** Starting points on an empty card; the card itself opens the page to add them */
function Ideas({ items }: { items: string[] }) {
  return (
    <div className="row wrap" style={{ gap: "0.35rem" }}>
      <span className="muted small">Start with one:</span>
      {items.slice(0, 4).map((i) => <span key={i} className="chip">{i}</span>)}
    </div>
  );
}

function babyStepsSummary(steps: BabySteps | null) {
  if (!steps || steps.score === null) return "Dave Ramsey's 7 steps: fill in your numbers";
  return steps.current === null ? "All 7 steps done" : `On step ${steps.current} of 7`;
}
