/** YYYY-MM-DD in local time, `back` days before `from` (today by default) */
export function isoDay(back = 0, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() - back);
  return d.toLocaleDateString("sv");
}

/** The day `by` days after `day` */
export const shiftDay = (day: string, by: number) => isoDay(-by, new Date(`${day}T12:00:00`));

/** "Tue 6 Oct" */
export const longDate = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/** Whole days from `from` to `to` (negative when `to` is earlier) */
export const daysBetween = (from: string, to: string) =>
  Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000);

/** "today", "tomorrow", "in 5 days", "2 days late" (past days read as late: they're deadlines) */
export function relative(day: string, today = isoDay(), past = "late") {
  const days = daysBetween(today, day);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ${past}`;
}
