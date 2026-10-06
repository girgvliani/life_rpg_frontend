import { isoDay, longDate, relative } from "../lib/dates";

/** One-of-many chips */
export function Choice<T extends string | number>({ options, value, onChange }: {
  options: [T, string][];
  value: T | null | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div className="row wrap" style={{ gap: "0.4rem" }}>
      {options.map(([v, label]) => (
        <button type="button" key={String(v)} className={`chip ${value === v ? "on" : ""}`} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );
}

/** XP presets plus a field for any other amount */
export function XpPicker({ value, onChange, presets }: { value: string; onChange: (v: string) => void; presets: [number, string][] }) {
  return (
    <div className="stack" style={{ gap: "0.4rem" }}>
      <Choice options={presets.map(([xp, label]) => [String(xp), `${label} · ${xp}`] as [string, string])} value={value} onChange={onChange} />
      <input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} aria-label="XP" />
    </div>
  );
}

/** Quick due dates plus a calendar; `optional` adds "No deadline" (empty string) */
export function DeadlinePicker({ value, onChange, optional = false }: { value: string; onChange: (v: string) => void; optional?: boolean }) {
  const quick: [string, string][] = [
    ...(optional ? [["", "No deadline"] as [string, string]] : []),
    [isoDay(), "Today"], [isoDay(-1), "Tomorrow"], [isoDay(-7), "In a week"], [isoDay(-30), "In a month"], [isoDay(-91), "3 months"],
  ];
  return (
    <div className="stack" style={{ gap: "0.4rem" }}>
      <span className="muted small">{value ? `Due ${longDate(value)} · ${relative(value)}` : "No deadline"}</span>
      <Choice options={quick} value={value} onChange={onChange} />
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Pick a date" />
    </div>
  );
}

/** "Open · 3 / Done · 5" */
export function OpenDone({ showDone, onChange, open, done }: { showDone: boolean; onChange: (v: boolean) => void; open: number; done: number }) {
  return (
    <div className="row" style={{ gap: "0.4rem" }}>
      <button type="button" className={`chip ${!showDone ? "on" : ""}`} onClick={() => onChange(false)}>Open · {open}</button>
      <button type="button" className={`chip ${showDone ? "on" : ""}`} onClick={() => onChange(true)}>Done · {done}</button>
    </div>
  );
}

/** A whole number from a text field; throws an Error naming the field */
export function wholeNumber(raw: string, label: string) {
  const n = Number(raw.trim());
  if (!raw.trim() || !Number.isInteger(n)) throw new Error(`${label}: enter a whole number`);
  return n;
}

export function required(raw: string, label: string) {
  const text = raw.trim();
  if (!text) throw new Error(`${label} can't be empty`);
  return text;
}
