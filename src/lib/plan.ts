import type { LifeArea, Todo } from "../api/types";
import { daysBetween, isoDay } from "./dates";

/** Ready-made goals (same as the phone app); empty fields are left to fill in */
export interface GoalPreset {
  label: string;
  type: string;
  target?: string;
  title?: string;
  unit?: string;
  start?: string;
}

export const GOAL_PRESETS: GoalPreset[] = [
  { label: "⚖️ Lose weight", type: "weight" },
  { label: "💪 50 push-ups in a row", type: "max_pushups", target: "50" },
  { label: "👟 10,000 steps a day", type: "steps", target: "10000" },
  { label: "😴 Sleep 8 hours", type: "sleep", target: "8" },
  { label: "💰 Monthly income", type: "income" },
  { label: "📚 Read 12 books", type: "custom", target: "12", title: "Read 12 books", unit: "books", start: "0" },
  { label: "🏃 Run 100 km", type: "custom", target: "100", title: "Run 100 km", unit: "km", start: "0" },
];

export const QUEST_XP: [number, string][] = [[10, "Quick"], [25, "Normal"], [50, "Hard"], [100, "Boss"]];
export const MILESTONE_XP: [number, string][] = [[250, "Small"], [500, "Solid"], [1000, "Big"], [2500, "Huge"], [5000, "Legendary"]];

export const MILESTONE_IDEAS: [string, number][] = [
  ["Run a 5K without stopping", 500],
  ["Read 12 books this year", 1000],
  ["30 days with no reels", 1000],
  ["Ship a side project", 2500],
  ["Save 3 months of expenses", 2500],
  ["Hold a 2-minute plank", 250],
];

/** What a quest is worth now: 1.5x on time, 1x up to a week late, 0.5x after (the server's rule) */
export function questXp(todo: Todo, today = isoDay()) {
  const late = daysBetween(todo.deadline, today);
  return Math.floor(todo.base_xp * (late <= 0 ? 1.5 : late <= 7 ? 1 : 0.5));
}

export const DUE_GROUPS = ["⚠️ Overdue", "Today", "This week", "Later"];

export function dueGroup(deadline: string, today = isoDay()) {
  const days = daysBetween(today, deadline);
  return days < 0 ? 0 : days === 0 ? 1 : days <= 7 ? 2 : 3;
}

/** Skills: "Category - Skill" names, 150 XP a level */
export const XP_PER_LEVEL = 150;
/** Habit and social XP land in these by name, so the server won't rename or delete them */
export const PROTECTED_SKILLS = new Set(["Health - Exercise", "Health - Sleep", "Health - Hygiene", "Social Balance"]);
export const skillCategory = (s: LifeArea) => (s.name.includes(" - ") ? s.name.split(" - ")[0] : s.name);
export const skillShort = (s: LifeArea) => (s.name.includes(" - ") ? s.name.split(" - ").slice(1).join(" - ") : s.name);
/** Just "Kotlin" unless another category has a "Kotlin" too */
export const skillLabel = (s: LifeArea, all: LifeArea[]) =>
  all.filter((o) => skillShort(o) === skillShort(s)).length > 1 ? s.name : skillShort(s);
