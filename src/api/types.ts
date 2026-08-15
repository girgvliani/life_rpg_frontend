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
