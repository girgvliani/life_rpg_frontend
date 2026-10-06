import type { StatResult } from "../api/types";

/** A stat's parts grouped for its page (same grouping and tips as the phone app's StatCategories.kt). */
export interface PartGroup {
  title: string;
  isDrain: boolean;
  parts: { name: string; earned: number | null; max: number; note: string; tip: string | null }[];
}

type Rule = [string, (name: string) => boolean];

/** Which group each component goes in, by stat; anything unlisted lands in "Other". */
const GROUPS: Record<string, Rule[]> = {
  MP: [
    ["😴 Sleep", (n) => n.startsWith("Sleep")],
    ["💼 Work", (n) => n === "Deep work"],
    ["🏃 Body", (n) => n === "Physical activity" || n === "Outdoors"],
    ["🧠 Mind", (n) => n === "Meditation"],
  ],
  PS: [["💪 Strength", () => true]],
  STA: [["🏃 Cardio", () => true]],
  H: [
    ["🍽️ Eating", (n) => ["Calories on target", "Protein", "Meals logged"].includes(n)],
    ["⚖️ Body", (n) => n === "Weight trend"],
  ],
  INT: [["📚 Learning", () => true]],
  DIS: [
    ["✅ Habits", (n) => ["Daily check-ins", "Slept 7-9h", "Showered"].includes(n) || n.endsWith("push-ups")],
    ["📋 Tasks", (n) => n === "Tasks done on time"],
    ["🍽️ Eating", (n) => n === "Ate within calories"],
  ],
  FOC: [
    ["📱 Feeds", (n) => n === "Reels / Shorts / TikTok" || n === "Social feeds"],
    ["🔓 Phone habits", (n) => n === "Unlocks" || n === "Phone after midnight"],
    ["⏱️ Screen time", (n) => n === "Total screen time"],
  ],
  SOC: [["👥 People", () => true]],
  WLT: [["💰 Money", () => true]],
};

/** Short, concrete advice for a part that isn't full yet */
const TIPS: Record<string, string> = {
  "Sleep last night": "Aim for 7–9 hours tonight.",
  "Sleep debt (7 days)": "Pay it back with an earlier night or two.",
  "Sleep regularity": "Fall asleep within 30 minutes of the same time every night.",
  "Sleep quality": "No caffeine 6h before bed, no phone in the last hour, go easy on alcohol.",
  "Deep work": "Block 2–4 hours of focused work with notifications off.",
  "Physical activity": "A 30-minute brisk walk or 8,000 steps.",
  "Outdoors": "20 minutes outside, in nature if you can.",
  "Meditation": "10 minutes of meditation.",
  "Reels / Shorts / TikTok": "Keep reels under 15 minutes. Goggins mode can nag you off them.",
  "Passive video over 2h": "Cap videos and series at 2 hours.",
  "Gaming over 2h": "Cap gaming at 2 hours.",
  "Overwork today": "Past 10 hours, output drops. Stop earlier and sleep.",
  "Overwork this week": "Past ~50 hours a week, extra hours stop paying off.",
  "Max push-up test": "Do a max push-up set once a week and log it.",
  "Training consistency": "Strength training at least 2 days a week.",
  "Steps (7-day avg)": "8,000–10,000 steps a day.",
  "Cardio minutes / week": "150–300 minutes of brisk activity a week.",
  "Calories on target": "Stay between 75% and 110% of your calorie target.",
  "Protein": "Hit your protein target: 1.6 g per kg of body weight.",
  "Meals logged": "Log all 3 meals: snap a photo each time.",
  "Weight trend": "Weigh in weekly; 0.5–1% of body weight a week is the healthy pace.",
  "Learning (28 days)": "About an hour of learning a day adds up fast.",
  "Daily check-ins": "Do the 30-second check-in every evening.",
  "Slept 7-9h": "7–9 hours every night.",
  "Showered": "Shower daily and tick it in the check-in.",
  "Tasks done on time": "Finish tasks before their deadline.",
  "Ate within calories": "Stay within your calorie target.",
  "Social feeds": "30 minutes of social feeds a day is plenty.",
  "Unlocks": "Put the phone in another room while you work.",
  "Phone after midnight": "Phone away by midnight.",
  "Total screen time": "Under 2–3 hours of phone time a day.",
  "Meaningful contacts / week": "3–4 real conversations a week, in person or on a call.",
  "Monthly income goal": "Log what you earn so Wealth can track it.",
};

const tipFor = (name: string) => TIPS[name] ?? (name.endsWith("push-ups") ? "Hit your daily push-up target." : null);

/** The stat's components and penalties, grouped; penalties become a "Drains" group */
export function partsOf(stat: StatResult): PartGroup[] {
  const rules = GROUPS[stat.code] ?? [];
  const groups = new Map<string, PartGroup["parts"]>(rules.map(([title]) => [title, []]));
  for (const c of stat.components) {
    const title = rules.find(([, matches]) => matches(c.name))?.[0] ?? "Other";
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title)!.push({
      name: c.name,
      earned: c.score === null ? null : c.score * c.weight,
      max: c.weight,
      note: c.note,
      tip: c.score !== null && c.score < 1 ? tipFor(c.name) : null,
    });
  }
  const result: PartGroup[] = [...groups].filter(([, parts]) => parts.length).map(([title, parts]) => ({ title, isDrain: false, parts }));
  if (stat.penalties.length) {
    result.push({
      title: "📉 Drains",
      isDrain: true,
      parts: stat.penalties.map((p) => ({ name: p.name, earned: -p.points, max: p.points, note: p.note, tip: tipFor(p.name) })),
    });
  }
  return result;
}
