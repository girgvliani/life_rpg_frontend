import { apiFetch } from "./client";
import type {
  Income,
  LifeArea,
  Milestone,
  Project,
  ShowerResult,
  SocialResult,
  Stats,
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
