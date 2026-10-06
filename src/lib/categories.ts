/** Icons and one-line descriptions for the six categories (the server sends their keys and names). */
const ICONS: Record<string, string> = {
  mental: "🧠",
  physical: "💪",
  practical: "🛠️",
  cultural: "📚",
  discipline: "🛡️",
  social: "👥",
};

const BLURBS: Record<string, string> = {
  mental: "Mental energy and attention: sleep, deep work, and what the phone does to your focus.",
  physical: "Strength, stamina, and how you eat and weigh.",
  practical: "Earning and providing: income against your monthly goal.",
  cultural: "Learning, reading and skills.",
  discipline: "Doing what you said you'd do: check-ins, habits, tasks on time, eating within your target.",
  social: "Real time with people.",
};

export const categoryIcon = (key: string) => ICONS[key] ?? "◆";

export const categoryBlurb = (key: string) => BLURBS[key] ?? "";
