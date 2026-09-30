// Mirrors backend/app/schemas.py

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface LifeArea {
  id: number;
  name: string;
  level: number;
  xp: number;
  last_active: string;
}

export interface XpResult {
  area: LifeArea;
  leveled_up: boolean;
  achievement: string | null;
}

export interface WorkoutResult {
  met_requirement: boolean;
  streak: number;
  bonus_xp: number;
  consistency_bonus: number;
  xp_result: XpResult | null;
}

export interface ShowerResult {
  already_logged: boolean;
  streak: number;
  xp_result: XpResult | null;
}

export interface ScreenTimeResult {
  over_limit: boolean;
  penalty: number;
}

export interface SocialResult {
  over_limit: boolean;
  count: number;
  penalty: number | null;
  xp_result: XpResult | null;
}

export interface Project {
  id: number;
  name: string;
  value: number;
  deadline: string;
  completed: boolean;
  completion_date: string | null;
  created_at: string;
}

export interface Todo {
  id: number;
  task: string;
  area_id: number;
  base_xp: number;
  deadline: string;
  completed: boolean;
  completion_date: string | null;
  created_at: string;
}

export interface Milestone {
  key: string;
  description: string;
  xp_reward: number;
  completed: boolean;
}

export interface Income {
  monthly_goal: number;
  current_month_earnings: number;
  target_month: string;
}

export interface HabitStatus {
  type: "shower" | "workout";
  streak: number;
  done_today: boolean;
}

export interface DailyScore {
  date: string;
  score: number;
  grade: string;
}

export interface Stats {
  life_areas: LifeArea[];
  habits: HabitStatus[];
  income: Income;
  milestones: Milestone[];
  todays_score: DailyScore | null;
}

// ---- Character sheet, streaks, goals, meals, profile (added with the phone app)

export interface StatComponent {
  name: string;
  weight: number;
  score: number | null;
  note: string;
}

export interface StatResult {
  code: string;
  name: string;
  score: number | null;
  grade: string | null;
  confidence: number;
  ceiling: number | null;
  ceiling_note: string;
  best_move: { name: string; points: number } | null;
  components: StatComponent[];
  penalties: { name: string; points: number; note: string }[];
}

export interface CharacterSheet {
  date: string;
  overall: number | null;
  overall_grade: string | null;
  stats: StatResult[];
}

export interface CharacterDay {
  date: string;
  overall: number | null;
  scores: Record<string, number | null>;
}

export interface Streak {
  key: string;
  name: string;
  emoji: string;
  rule: string;
  current: number;
  best: number;
  done_today: boolean;
  at_risk: boolean;
  broken_today: boolean;
}

export interface Streaks {
  date: string;
  mood: "happy" | "worried" | "angry" | "idle";
  message: string;
  streaks: Streak[];
}

export type GoalType = "weight" | "max_pushups" | "steps" | "sleep" | "income" | "custom";

export interface Goal {
  id: number;
  type: GoalType;
  title: string;
  unit: string;
  start_value: number;
  target_value: number;
  current_value: number | null;
  progress: number | null;
  direction: "increase" | "decrease";
  achieved: boolean;
  deadline: string | null;
  intensity: number;
  created_at: string;
}

export interface Profile {
  display_name: string | null;
  currency: string;
  timezone: string;
  pushup_target: number;
  steps_target: number;
  sleep_target: number;
  height_cm: number | null;
  birth_year: number | null;
  sex: "male" | "female" | null;
}

export interface MealItem {
  name: string;
  grams: number | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: number;
  date: string;
  eaten_at: string;
  meal_type: string;
  name: string;
  items: MealItem[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
  confidence: number | null;
}

export interface DayMeals {
  date: string;
  meals: Meal[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  targets: {
    calories: number | null;
    protein: number | null;
    bmr: number | null;
    tdee: number | null;
    adjustment: number;
    missing: string[];
  };
}

/** One day's logged data: what the phone sent, what you entered, and the two combined */
export interface DailyLog {
  date: string;
  auto: Record<string, Record<string, unknown>>;
  manual: Record<string, Record<string, unknown>>;
  merged: Record<string, Record<string, unknown>>;
  updated_at: string | null;
}

export interface Device {
  id: number;
  name: string;
  created_at: string;
  last_used_at: string | null;
  token?: string; // only right after creating it
}

export interface Level {
  level: number;
  title: string;
  next_title: string | null;
  xp: number;
  level_start_xp: number;
  next_level_xp: number;
  today_xp: number;
  today: { reason: string; xp: number }[];
  sources: Record<string, number>;
  history: { date: string; xp: number }[];
}
