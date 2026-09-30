import { ApiError, apiFetch } from "./client";
import type {
  CharacterDay,
  CharacterSheet,
  DailyLog,
  DayMeals,
  Device,
  Goal,
  Income,
  Level,
  LifeArea,
  Meal,
  MealItem,
  Milestone,
  Profile,
  Project,
  ShowerResult,
  SocialResult,
  Stats,
  Streaks,
  Todo,
  User,
  WorkoutResult,
  XpResult,
} from "./types";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export const register = (email: string, password: string) =>
  apiFetch<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) });

export const login = (email: string, password: string) =>
  apiFetch<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const logout = () => apiFetch<void>("/auth/logout", { method: "POST" });

export const getMe = () => apiFetch<User>("/auth/me");

export const getStats = () => apiFetch<Stats>("/stats");

export const getLifeAreas = () => apiFetch<LifeArea[]>("/life-areas");

export const logWorkout = (count: number) =>
  apiFetch<WorkoutResult>("/habits/workout", { method: "POST", body: JSON.stringify({ count }) });

export const logShower = () => apiFetch<ShowerResult>("/habits/shower", { method: "POST" });

export const logSleep = (hours: number) =>
  apiFetch<XpResult>("/sleep", { method: "POST", body: JSON.stringify({ hours }) });

export const logScreenTime = (hours: number) =>
  apiFetch<{ over_limit: boolean; penalty: number }>("/screen-time", {
    method: "POST",
    body: JSON.stringify({ hours }),
  });

export const logSocialInteraction = () => apiFetch<SocialResult>("/social-interaction", { method: "POST" });

export const getProjects = () => apiFetch<Project[]>("/projects");

export const createProject = (name: string, value: number, deadline: string) =>
  apiFetch<Project>("/projects", { method: "POST", body: JSON.stringify({ name, value, deadline }) });

export const completeProject = (id: number) => apiFetch<Project>(`/projects/${id}/complete`, { method: "POST" });

export const getTodos = () => apiFetch<Todo[]>("/todos");

export const createTodo = (task: string, area_id: number, base_xp: number, deadline: string) =>
  apiFetch<Todo>("/todos", { method: "POST", body: JSON.stringify({ task, area_id, base_xp, deadline }) });

export const completeTodo = (id: number) => apiFetch<Todo>(`/todos/${id}/complete`, { method: "POST" });

export const getMilestones = () => apiFetch<Milestone[]>("/milestones");

export const completeMilestone = (key: string) => apiFetch<Milestone>(`/milestones/${key}/complete`, { method: "POST" });

export const getIncome = () => apiFetch<Income>("/income");

export const updateIncome = (payload: Partial<Income>) =>
  apiFetch<Income>("/income", { method: "PUT", body: JSON.stringify(payload) });

// ---- Character sheet, streaks, check-ins, goals, meals, profile, devices

export const getCharacter = () => apiFetch<CharacterSheet>("/stats/character");

export const getCharacterHistory = (start: string) =>
  apiFetch<CharacterDay[]>(`/stats/character/history?start=${start}`);

export const getStreaks = () => apiFetch<Streaks>("/stats/streaks");

/** null when nothing is logged that day */
export const getDailyLog = (day: string) =>
  apiFetch<DailyLog>(`/daily-logs/${day}`).catch((err) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });

export const saveCheckIn = (day: string, sections: Record<string, Record<string, unknown>>) =>
  apiFetch<DailyLog>(`/daily-logs/${day}`, { method: "PUT", body: JSON.stringify(sections) });

export const clearCheckInField = (day: string, section: string, field: string) =>
  apiFetch<void>(`/daily-logs/${day}?source=manual&section=${section}&field=${field}`, { method: "DELETE" });

export const getGoals = () => apiFetch<Goal[]>("/goals");

export const createGoal = (body: Record<string, unknown>) =>
  apiFetch<Goal>("/goals", { method: "POST", body: JSON.stringify(body) });

export const updateGoal = (id: number, body: Record<string, unknown>) =>
  apiFetch<Goal>(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteGoal = (id: number) => apiFetch<void>(`/goals/${id}`, { method: "DELETE" });

export const getProfile = () => apiFetch<Profile>("/profile");

export const updateProfile = (body: Partial<Profile>) =>
  apiFetch<Profile>("/profile", { method: "PATCH", body: JSON.stringify(body) });

export const getMeals = (day?: string) => apiFetch<DayMeals>(day ? `/meals?day=${day}` : "/meals");

export const logMeal = (body: { name: string; items: Partial<MealItem>[]; eaten_at?: string }) =>
  apiFetch<Meal>("/meals", { method: "POST", body: JSON.stringify(body) });

/** The server reads the photo with AI; this can take ~30 seconds */
export const logMealPhoto = (photo: File) => {
  const form = new FormData();
  form.append("photo", photo);
  return apiFetch<Meal>("/meals/photo", { method: "POST", body: form });
};

export const updateMeal = (id: number, body: { items?: Partial<MealItem>[]; name?: string }) =>
  apiFetch<Meal>(`/meals/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteMeal = (id: number) => apiFetch<void>(`/meals/${id}`, { method: "DELETE" });

export const getDevices = () => apiFetch<Device[]>("/devices");

export const createDevice = (name: string) =>
  apiFetch<Device>("/devices", { method: "POST", body: JSON.stringify({ name }) });

export const revokeDevice = (id: number) => apiFetch<void>(`/devices/${id}`, { method: "DELETE" });

export const getLevel = () => apiFetch<Level>("/stats/level");
