import { ApiError, apiFetch } from "./client";
import type {
  CharacterDay,
  CharacterSheet,
  DailyLog,
  DayMeals,
  Answers,
  Attempt,
  Device,
  FieldCatalog,
  FriendView,
  FriendsOverview,
  GlobalBoard,
  Goal,
  Income,
  Level,
  LifeArea,
  Meal,
  MealItem,
  Milestone,
  Profile,
  Project,
  Questionnaire,
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

export const updateProject = (id: number, body: Partial<Pick<Project, "name" | "value" | "deadline">>) =>
  apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteProject = (id: number) => apiFetch<void>(`/projects/${id}`, { method: "DELETE" });

export const updateTodo = (id: number, body: Partial<Pick<Todo, "task" | "area_id" | "base_xp" | "deadline">>) =>
  apiFetch<Todo>(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteTodo = (id: number) => apiFetch<void>(`/todos/${id}`, { method: "DELETE" });

export const createMilestone = (description: string, xp_reward: number) =>
  apiFetch<Milestone>("/milestones", { method: "POST", body: JSON.stringify({ description, xp_reward }) });

export const updateMilestone = (key: string, description: string, xp_reward: number) =>
  apiFetch<Milestone>(`/milestones/${key}`, { method: "PATCH", body: JSON.stringify({ description, xp_reward }) });

export const deleteMilestone = (key: string) => apiFetch<void>(`/milestones/${key}`, { method: "DELETE" });

/** "Category - Skill" groups it with the others in that category */
export const createLifeArea = (name: string) =>
  apiFetch<LifeArea>("/life-areas", { method: "POST", body: JSON.stringify({ name }) });

export const renameLifeArea = (id: number, name: string) =>
  apiFetch<LifeArea>(`/life-areas/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });

export const deleteLifeArea = (id: number) => apiFetch<void>(`/life-areas/${id}`, { method: "DELETE" });

// ---- Friends

export const getFriends = () => apiFetch<FriendsOverview>("/friends");

/** Turn sharing switches on or off; applies to all friends */
export const updateSharing = (body: Partial<FriendsOverview["sharing"]>) =>
  apiFetch<FriendsOverview["sharing"]>("/friends/sharing", { method: "PATCH", body: JSON.stringify(body) });

/** By friend code or email, whichever `who` looks like */
export const addFriend = (who: string) =>
  apiFetch<{ status: "pending" | "accepted"; name: string }>("/friends/requests", {
    method: "POST",
    body: JSON.stringify(who.includes("@") ? { email: who.trim() } : { code: who.trim() }),
  });

export const acceptFriend = (requestId: number) => apiFetch<unknown>(`/friends/requests/${requestId}/accept`, { method: "POST" });

/** Decline a request to you, or take back one you sent */
export const dropFriendRequest = (requestId: number) => apiFetch<void>(`/friends/requests/${requestId}`, { method: "DELETE" });

export const removeFriend = (userId: number) => apiFetch<void>(`/friends/${userId}`, { method: "DELETE" });

/** Everyone by level and XP: the top 50 and your own place */
export const getGlobalBoard = () => apiFetch<GlobalBoard>("/friends/global");

/** You (everything) and your friends (what they share) */
export const getLeaderboard = () => apiFetch<FriendView[]>("/friends/leaderboard");

// ---- Chrome history import (the history stays in the browser; only daily totals and site groups are sent)

export const getSiteGroups = () => apiFetch<{ categories: string[]; groups: Record<string, string> }>("/browsing/groups");

export const saveSiteGroups = (groups: Record<string, string>) =>
  apiFetch<{ groups: Record<string, string> }>("/browsing/groups", { method: "PUT", body: JSON.stringify({ groups }) });

/** Up to 31 days of totals per call, as the daily logs' "browser" section */
export const saveBrowsingDays = (days: { date: string; browser: Record<string, number> }[]) =>
  apiFetch<unknown>("/daily-logs/batch?source=auto", { method: "POST", body: JSON.stringify({ days }) });

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

/** Every day with something logged between start and end */
export const getDailyLogs = (start: string, end: string) => apiFetch<DailyLog[]>(`/daily-logs?start=${start}&end=${end}`);

/** What each value is, how it's entered and which stats read it */
export const getLogFields = () => apiFetch<FieldCatalog>("/daily-logs/fields");

/** Remove one value: "manual" (your correction), "auto" (the phone's) or "all" */
export const clearLogField = (day: string, section: string, field: string, source: "manual" | "auto" | "all") =>
  apiFetch<void>(`/daily-logs/${day}?source=${source}&section=${section}&field=${field}`, { method: "DELETE" });

/** The questions, answers to start from, and the latest results */
export const getQuestionnaire = () => apiFetch<Questionnaire>("/questionnaire");

/** Saves an attempt (every one is kept) and returns priorities, focus areas and plan */
export const submitQuestionnaire = (answers: Answers) =>
  apiFetch<Attempt>("/questionnaire", { method: "POST", body: JSON.stringify({ answers }) });

export const getAttempts = () => apiFetch<Attempt[]>("/questionnaire/attempts");

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
