import { useState } from "react";
import type { RefCallback } from "react";
import { useNavigate } from "react-router-dom";
import { clearLogField, getCharacter, getDailyLog, getDailyLogs, getIncome, getLogFields, getProfile, saveCheckIn } from "../api/endpoints";
import type { DailyLog, FieldCatalog, LogField } from "../api/types";
import { Card, Loaded, PageHeader } from "../components/ui";
import { useLevel } from "../context/LevelContext";
import { errorText, useLoad } from "../lib/load";
import { statColor } from "../lib/stats";

/** Days in the strip above a day's values */
const STRIP_DAYS = 14;

/** YYYY-MM-DD in local time, `back` days ago */
function isoDay(back = 0, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() - back);
  return d.toLocaleDateString("sv");
}

const shift = (day: string, by: number) => isoDay(-by, new Date(`${day}T12:00:00`));

const longDate = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

function relative(day: string, today: string) {
  const days = Math.round((new Date(`${day}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  return days < 0 ? `${-days} days ago` : `in ${days} days`;
}

const get = (part: DailyLog["auto"] | undefined, section: string, key: string) => {
  const value = part?.[section]?.[key];
  return value === undefined || value === null ? undefined : value;
};

/** A value as people read it: "Yes", "7.5 h", "9,214" */
function show(field: LogField, value: unknown, unit = true): string {
  let text: string;
  if (field.kind === "yesno") return value === true || value === "true" ? "Yes" : "No";
  else if (typeof value === "number") text = field.kind === "whole" ? value.toLocaleString("en-US") : String(Math.round(value * 10) / 10);
  else text = String(value);
  return unit && field.unit ? `${text} ${field.unit}` : text;
}

/** The typed text as the server wants it, or an Error saying what's wrong */
function parse(field: LogField, text: string): unknown {
  const raw = text.trim().replace(",", ".");
  if (!raw) throw new Error("Enter a value, or delete it instead");
  if (field.kind === "yesno") return raw === "true";
  if (field.kind === "time") {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) throw new Error("Use HH:MM, e.g. 23:30");
    return raw;
  }
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) throw new Error("Enter a number");
  if (field.kind === "whole" && !Number.isInteger(n)) throw new Error("Enter a whole number");
  return n;
}

/** The strip opens on its newest days, which are what you usually want on a narrow screen */
const scrollToEnd: RefCallback<HTMLDivElement> = (el) => {
  if (el) el.scrollLeft = el.scrollWidth;
};

/** Apps whose package names say little about them */
const KNOWN_APPS: Record<string, string> = {
  "com.zhiliaoapp.musically": "TikTok", "com.ss.android.ugc.trill": "TikTok", "com.facebook.katana": "Facebook",
  "com.facebook.orca": "Messenger", "org.telegram.messenger": "Telegram", "com.twitter.android": "X",
  "com.google.android.youtube": "YouTube", "com.android.chrome": "Chrome", "com.whatsapp": "WhatsApp",
  "com.snapchat.android": "Snapchat", "com.reddit.frontpage": "Reddit", "com.sec.android.app.sbrowser": "Samsung Internet",
};

/** com.instagram.android → Instagram */
function appName(pkg: string) {
  if (KNOWN_APPS[pkg]) return KNOWN_APPS[pkg];
  const generic = new Set(["com", "android", "app", "apps", "google", "org", "net", "mobile"]);
  const last = pkg.split(".").filter((p) => !generic.has(p)).pop() ?? pkg;
  return last[0].toUpperCase() + last.slice(1);
}

/**
 * Everything the stats are built from: the profile, and every value of every day, where it came from
 * (phone or typed in) and which stats read it. Click a value to correct it, give the phone's back, or
 * delete it.
 */
export function AboutPage() {
  const today = isoDay();
  const base = useLoad(async () => {
    const [catalog, profile, income, sheet, recent] = await Promise.all([
      getLogFields(), getProfile(), getIncome(), getCharacter().catch(() => null), getDailyLogs(isoDay(STRIP_DAYS - 1), today),
    ]);
    return { catalog, profile, income, names: Object.fromEntries((sheet?.stats ?? []).map((s) => [s.code, s.name])), recent };
  });
  const [day, setDay] = useState(today);
  const navigate = useNavigate();

  return (
    <div className="stack">
      <PageHeader title="ABOUT YOU" subtitle="Everything your stats are built from. Click any value to correct it." />
      <Loaded load={base}>
        {({ catalog, profile, income, names, recent }) => {
          const logged = new Set(recent.filter((d) => Object.keys(d.auto).length || Object.keys(d.manual).length).map((d) => d.date));
          const weight = [...recent].reverse()
            .map((d) => get(d.manual, "body", "weight_kg") ?? get(d.auto, "body", "weight_kg"))
            .find((w) => w !== undefined) as number | undefined;
          const info: [string, string][] = [
            ["Age", profile.birth_year ? String(new Date().getFullYear() - profile.birth_year) : "–"],
            ["Height", profile.height_cm ? `${Math.round(profile.height_cm)} cm` : "–"],
            ["Weight", weight !== undefined ? `${weight} kg` : "–"],
            ["Sex", profile.sex ? profile.sex[0].toUpperCase() + profile.sex.slice(1) : "–"],
            ["Push-ups / day", String(profile.pushup_target)],
            ["Steps / day", profile.steps_target.toLocaleString("en-US")],
            ["Sleep", `${profile.sleep_target} h`],
            ["Income goal", income.monthly_goal ? `${income.monthly_goal.toLocaleString("en-US")} ${profile.currency}` : "–"],
            ["Earned this month", `${income.current_month_earnings.toLocaleString("en-US")} ${profile.currency}`],
          ];
          const missing = [!profile.height_cm && "height", !profile.birth_year && "birth year", !profile.sex && "sex"].filter(Boolean);
          return (
            <>
              <Card title={profile.display_name ?? "Your profile"} action={<button className="ghost" onClick={() => navigate("/settings")}>Edit</button>}>
                <div className="info-grid">
                  {info.map(([label, value]) => (
                    <div key={label}>
                      <div className="muted small">{label}</div>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                {missing.length > 0 && (
                  <span className="small" style={{ color: "var(--bad)" }}>Add your {missing.join(", ")} for a calorie target (Health).</span>
                )}
              </Card>

              <div className="section-title">Your days</div>
              <div className="row wrap" style={{ gap: "0.5rem" }}>
                <button className="ghost" onClick={() => setDay(shift(day, -1))} aria-label="Previous day">‹</button>
                <input type="date" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value <= today ? e.target.value : today)} />
                <button className="ghost" onClick={() => setDay(shift(day, 1))} disabled={day >= today} aria-label="Next day">›</button>
                <span className="muted small">{longDate(day)} · {relative(day, today)}</span>
              </div>
              <div className="day-strip" ref={scrollToEnd}>
                {Array.from({ length: STRIP_DAYS }, (_, i) => isoDay(STRIP_DAYS - 1 - i)).map((d) => (
                  <button key={d} className={`day-chip ${d === day ? "on" : ""}`} onClick={() => setDay(d)}>
                    <span className="muted small">{new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short" })}</span>
                    <strong>{Number(d.slice(8))}</strong>
                    <span className={`dot ${logged.has(d) ? "on" : ""}`} aria-label={logged.has(d) ? "has data" : "no data"} />
                  </button>
                ))}
              </div>
              <DayValues key={day} day={day} catalog={catalog} names={names} onChanged={base.reload} />
            </>
          );
        }}
      </Loaded>
    </div>
  );
}

function DayValues({ day, catalog, names, onChanged }: {
  day: string;
  catalog: FieldCatalog;
  names: Record<string, string>;
  onChanged: () => void;
}) {
  const log = useLoad(() => getDailyLog(day));
  const [showEmpty, setShowEmpty] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const { refresh: refreshLevel } = useLevel();

  async function change(action: () => Promise<unknown>) {
    await action();
    setEditing(null);
    log.reload();
    onChanged();
    refreshLevel();
  }

  return (
    <Loaded load={log}>
      {(entry) => {
        const empty = !entry || (!Object.keys(entry.auto).length && !Object.keys(entry.manual).length);
        const apps = (get(entry?.manual, "screen", "apps") ?? get(entry?.auto, "screen", "apps")) as Record<string, number> | undefined;
        const topApps = Object.entries(apps ?? {}).filter(([, m]) => m > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
        return (
          <div className="stack">
            <div className="row wrap">
              <span className="muted small grow">📱 sent by the phone · ✍ typed by you (yours wins)</span>
              <button className={`chip ${showEmpty ? "on" : ""}`} onClick={() => setShowEmpty(!showEmpty)}>Show empty values</button>
            </div>
            {empty && !showEmpty && <Card><span className="muted">Nothing logged for this day. Turn on "Show empty values" to add something.</span></Card>}
            <div className="grid grid-2" style={{ alignItems: "start" }}>
              {catalog.sections.map(({ key: section, title }) => {
                const fields = catalog.fields.filter((f) => f.section === section &&
                  (showEmpty || get(entry?.manual, f.section, f.key) !== undefined || get(entry?.auto, f.section, f.key) !== undefined));
                const sectionApps = section === "screen" ? topApps : [];
                if (!fields.length && !sectionApps.length) return null;
                return (
                  <Card key={section} title={title}>
                    {fields.map((f) => {
                      const id = `${f.section}.${f.key}`;
                      return (
                        <FieldRow key={id} field={f} entry={entry} names={names} open={editing === id}
                          onToggle={() => setEditing(editing === id ? null : id)} onChange={change} day={day} />
                      );
                    })}
                    {sectionApps.length > 0 && (
                      <div className="stack" style={{ gap: "0.25rem" }}>
                        <span className="muted small">Top apps</span>
                        {sectionApps.map(([pkg, minutes]) => (
                          <div key={pkg} className="row spread small"><span>{appName(pkg)}</span><span className="muted">{minutes} min</span></div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      }}
    </Loaded>
  );
}

function FieldRow({ field, entry, names, open, onToggle, onChange, day }: {
  field: LogField;
  entry: DailyLog | null;
  names: Record<string, string>;
  open: boolean;
  onToggle: () => void;
  onChange: (action: () => Promise<unknown>) => Promise<void>;
  day: string;
}) {
  const typed = get(entry?.manual, field.section, field.key);
  const phone = get(entry?.auto, field.section, field.key);
  const value = typed ?? phone;
  const [text, setText] = useState(value === undefined ? "" : field.kind === "yesno" ? String(value) : show(field, value, false).replace(/,/g, ""));
  const [error, setError] = useState<string | null>(null);

  const source =
    typed !== undefined && phone !== undefined && typed !== phone ? `✍ you · 📱 phone said ${show(field, phone)}`
      : typed !== undefined ? "✍ you" : phone !== undefined ? "📱 phone" : "not logged";

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await onChange(action);
    } catch (err) {
      setError(errorText(err));
    }
  }

  function save() {
    let parsed: unknown;
    try {
      parsed = parse(field, text);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    run(() => saveCheckIn(day, { [field.section]: { [field.key]: parsed } }));
  }

  return (
    <div className={`field-row ${open ? "open" : ""}`}>
      <button className="link field-row-head" onClick={onToggle} aria-expanded={open}>
        <div className="row spread">
          <span>{field.label}</span>
          <strong className={value === undefined ? "muted" : ""}>{value === undefined ? "–" : show(field, value)}</strong>
        </div>
        <div className="row spread small">
          <span className="muted">{source}</span>
          {field.feeds.length ? (
            <span className="row" style={{ gap: "0.4rem" }}>
              {field.feeds.map((code) => <strong key={code} style={{ color: statColor(code) }}>{code}</strong>)}
            </span>
          ) : (
            <span className="muted">feeds no stat</span>
          )}
        </div>
      </button>
      {open && (
        <div className="stack field-editor" style={{ gap: "0.5rem" }}>
          {field.kind === "yesno" ? (
            <div className="row" style={{ gap: "0.4rem" }}>
              {[["true", "Yes"], ["false", "No"]].map(([v, label]) => (
                <button key={v} className={`chip ${text === v ? "on" : ""}`} onClick={() => setText(v)}>{label}</button>
              ))}
            </div>
          ) : (
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} inputMode={field.kind === "time" ? "text" : "decimal"}
              placeholder={field.kind === "time" ? "HH:MM" : field.unit || "value"} onKeyDown={(e) => e.key === "Enter" && save()} />
          )}
          <span className="muted small">
            {field.feeds.length ? `Feeds ${field.feeds.map((c) => names[c] ?? c).join(", ")}` : "Kept for later; no stat reads it yet."}
          </span>
          <div className="row wrap" style={{ gap: "0.5rem" }}>
            <button onClick={save}>Save</button>
            {typed !== undefined && phone !== undefined && (
              <button className="ghost" onClick={() => run(() => clearLogField(day, field.section, field.key, "manual"))}>
                Use the phone's value ({show(field, phone)})
              </button>
            )}
            {value !== undefined && (
              <button className="danger" onClick={() => {
                const note = phone !== undefined ? " The phone sends the last two days again on its next sync, so a recent value can come back." : "";
                if (confirm(`Delete ${field.label.toLowerCase()} for ${longDate(day)}?${note}`)) {
                  run(() => clearLogField(day, field.section, field.key, "all"));
                }
              }}>Delete</button>
            )}
            <button className="ghost" onClick={onToggle}>Cancel</button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
