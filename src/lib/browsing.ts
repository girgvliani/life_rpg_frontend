/**
 * Reading a Chrome history export (Google Takeout → Chrome → BrowserHistory.json) in the browser.
 * The history never leaves this page; only each day's totals per category are sent to the server.
 */

export const CATEGORIES = ["work", "learning", "social", "entertainment", "shopping", "news", "other", "ignore"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  work: "💼 Work",
  learning: "📚 Learning",
  social: "💬 Social",
  entertainment: "🎬 Entertainment",
  shopping: "🛒 Shopping",
  news: "📰 News",
  other: "🌐 Other",
  ignore: "🚫 Ignore",
};

export interface Visit {
  time: number; // ms since 1970
  url: string;
  title: string;
}

/** Visits from the export, oldest first; throws with a readable message for the wrong file */
export function parseHistory(text: string): Visit[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That isn't a JSON file. Pick the .json file from the Chrome folder of your Takeout export.");
  }
  const list = (data as Record<string, unknown>)["Browser History"];
  if (!Array.isArray(list)) throw new Error("No Chrome history in that file. It should be BrowserHistory.json (or History.json) from Takeout → Chrome.");
  return list
    .map((v: { url?: string; title?: string; time_usec?: number }) => ({ time: Math.floor((v.time_usec ?? 0) / 1000), url: v.url ?? "", title: v.title ?? "" }))
    .filter((v) => v.time > 0 && /^https?:/.test(v.url))
    .sort((a, b) => a.time - b.time);
}

/** The site a visit belongs to: the host with its port ("localhost:3000"), YouTube Shorts and Google searches apart */
export function siteOf(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, "").toLowerCase();
    if (/(^|\.)youtube\.com$/.test(host) && u.pathname.startsWith("/shorts")) return "youtube.com/shorts";
    if (/^google\.[a-z.]+$/.test(host) && u.pathname === "/search") return "google search";
    return host;
  } catch {
    return "other";
  }
}

/** The search terms of a Google search visit, if it is one */
export function searchTerms(url: string): string | null {
  try {
    const u = new URL(url);
    return /google\.[a-z.]+$/.test(u.host) && u.pathname === "/search" ? u.searchParams.get("q") : null;
  } catch {
    return null;
  }
}

/** Starting guesses; anything the user picks wins */
const GUESSES: [RegExp, Category][] = [
  [/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/, "work"],
  [/(^|\.)(github|gitlab|bitbucket)\.(com|org)$|stackoverflow\.com$|stackexchange\.com$|vercel\.(com|app)$|railway\.(app|com)$|figma\.com$|linear\.app$|atlassian\.net$|notion\.so$|docs\.google\.com$|drive\.google\.com$|chatgpt\.com$|claude\.ai$|npmjs\.com$|developer\.android\.com$/, "work"],
  [/wikipedia\.org$|coursera\.org$|udemy\.com$|khanacademy\.org$|developer\.mozilla\.org$|duolingo\.com$|medium\.com$|scholar\.google/, "learning"],
  [/(^|\.)(instagram|facebook|tiktok|reddit|linkedin|discord|snapchat|pinterest|threads)\.(com|net)$|^x\.com$|twitter\.com$|web\.whatsapp\.com$|web\.telegram\.org$|messenger\.com$/, "social"],
  [/youtube\.com|youtu\.be$|netflix\.com$|twitch\.tv$|spotify\.com$|9gag\.com$|imdb\.com$|primevideo\.com$|disneyplus\.com$|kick\.com$/, "entertainment"],
  [/amazon\.|ebay\.|aliexpress\.com$|temu\.com$|etsy\.com$|mymarket\.ge$|veli\.store$|zoommer\.ge$/, "shopping"],
  [/(^|\.)(bbc|cnn|reuters|nytimes|theguardian)\.(com|co\.uk)$|news\.google\.com$|civil\.ge$|interpressnews\.ge$|on\.ge$/, "news"],
];

export function guess(site: string): Category {
  if (site === "google search") return "learning";
  return GUESSES.find(([pattern]) => pattern.test(site))?.[1] ?? "other";
}

/** A visit counts until the next one, at most 10 minutes; after a 30+ minute gap you'd likely left: 1 minute */
const CAP = 10 * 60_000;
const AWAY = 30 * 60_000;

export function estimates(visits: Visit[]): number[] {
  return visits.map((v, i) => {
    const gap = (visits[i + 1]?.time ?? v.time + 60_000) - v.time;
    return gap > AWAY ? 60_000 : Math.min(gap, CAP);
  });
}

export const dayOf = (time: number) => new Date(time).toLocaleDateString("sv");

export interface SiteSummary {
  site: string;
  visits: number;
  ms: number;
  last: number;
}

export interface DaySummary {
  day: string;
  ms: Record<Category, number>;
  visits: number;
  searches: number;
  shorts: number;
}

const emptyMs = () => Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;

/** Sites by estimated time, and each day's minutes per category (ignored sites count nowhere) */
export function summarize(visits: Visit[], categoryOf: (site: string) => Category) {
  const times = estimates(visits);
  const sites = new Map<string, SiteSummary>();
  const days = new Map<string, DaySummary>();
  visits.forEach((v, i) => {
    const site = siteOf(v.url);
    const s = sites.get(site) ?? { site, visits: 0, ms: 0, last: 0 };
    s.visits++;
    s.ms += times[i];
    s.last = Math.max(s.last, v.time);
    sites.set(site, s);
    const category = categoryOf(site);
    if (category === "ignore") return;
    const key = dayOf(v.time);
    const d = days.get(key) ?? { day: key, ms: emptyMs(), visits: 0, searches: 0, shorts: 0 };
    d.ms[category] += times[i];
    d.visits++;
    if (site === "google search") d.searches++;
    if (site === "youtube.com/shorts") d.shorts++;
    days.set(key, d);
  });
  return {
    sites: [...sites.values()].sort((a, b) => b.ms - a.ms),
    days: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
  };
}

/** A day as the server's "browser" section: every category sent, so a re-import replaces old numbers */
export function toBrowserSection(d: DaySummary) {
  const min = (c: Category) => Math.min(1440, Math.round(d.ms[c] / 60_000));
  return {
    work_min: min("work"), learning_min: min("learning"), social_min: min("social"), entertainment_min: min("entertainment"),
    shopping_min: min("shopping"), news_min: min("news"), other_min: min("other"),
    visits: d.visits, searches: d.searches, shorts: d.shorts,
  };
}

export const hm = (ms: number) => {
  const min = Math.round(ms / 60_000);
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
};
