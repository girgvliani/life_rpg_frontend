import { useEffect, useState, type FormEvent } from "react";
import { clearCheckInField, getDailyLog, saveCheckIn } from "../api/endpoints";
import type { DailyLog } from "../api/types";
import { Card, PageHeader } from "../components/ui";
import { useLevel } from "../context/LevelContext";
import { errorText, useLoad } from "../lib/load";

type Kind = "decimal" | "whole" | "yesno";

interface Field {
  section: string;
  key: string;
  label: string;
  kind: Kind;
}

/** What the check-in asks, grouped by the server's daily-log sections (same as the phone app). */
const FIELDS: Field[] = [
  { section: "sleep", key: "hours", label: "Hours slept", kind: "decimal" },
  { section: "sleep", key: "alcohol", label: "Alcoholic drinks the evening before", kind: "whole" },
  { section: "sleep", key: "late_caffeine", label: "Caffeine within 6h of bedtime", kind: "yesno" },
  { section: "work", key: "total", label: "Hours worked", kind: "decimal" },
  { section: "work", key: "deep", label: "Of those, deep-focus hours", kind: "decimal" },
  { section: "mind", key: "learning_min", label: "Minutes learning", kind: "whole" },
  { section: "mind", key: "meditation_min", label: "Minutes of meditation", kind: "whole" },
  { section: "body", key: "pushups", label: "Push-ups today", kind: "whole" },
  { section: "body", key: "max_pushups", label: "Max push-ups in one set", kind: "whole" },
  { section: "body", key: "strength", label: "Other strength training", kind: "yesno" },
  { section: "body", key: "outdoor_min", label: "Minutes outdoors", kind: "whole" },
  { section: "body", key: "shower", label: "Showered", kind: "yesno" },
  { section: "body", key: "weight_kg", label: "Weight (kg)", kind: "decimal" },
  { section: "social", key: "interactions", label: "Meaningful contacts (30+ min)", kind: "whole" },
];

const SECTIONS: Record<string, string> = { sleep: "😴 Sleep", work: "💼 Work", mind: "🧠 Mind", body: "🏃 Body", social: "👥 Social" };

const id = (f: Field) => `${f.section}.${f.key}`;

function isoDay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString("sv"); // YYYY-MM-DD in local time
}

function shown(log: DailyLog | null, source: "auto" | "manual", f: Field): string | undefined {
  const value = log?.[source]?.[f.section]?.[f.key];
  return value === undefined || value === null ? undefined : String(value);
}

export function CheckInPage() {
  const [offset, setOffset] = useState(0);
  const day = isoDay(offset);
  const log = useLoad(() => getDailyLog(day), [day]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { refresh: refreshLevel } = useLevel();

  // Start from what was entered before for this day
  useEffect(() => {
    const entered: Record<string, string> = {};
    FIELDS.forEach((f) => {
      const v = shown(log.data ?? null, "manual", f);
      if (v !== undefined) entered[id(f)] = v;
    });
    setValues(entered);
    setMessage(null);
  }, [log.data]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, Record<string, unknown>> = {};
      for (const f of FIELDS) {
        const raw = (values[id(f)] ?? "").trim();
        if (!raw) continue;
        const value = f.kind === "yesno" ? raw === "true" : Number(raw.replace(",", "."));
        if (typeof value === "number" && (Number.isNaN(value) || (f.kind === "whole" && !Number.isInteger(value)))) {
          throw new Error(`${f.label}: enter a ${f.kind === "whole" ? "whole " : ""}number`);
        }
        (body[f.section] ??= {})[f.key] = value;
      }
      if (Object.keys(body).length) await saveCheckIn(day, body);
      // Emptied fields go back to the phone's value
      for (const f of FIELDS) {
        if (shown(log.data ?? null, "manual", f) !== undefined && !(values[id(f)] ?? "").trim()) {
          await clearCheckInField(day, f.section, f.key);
        }
      }
      setMessage({ ok: true, text: "✅ Saved" });
      log.reload();
      refreshLevel();
    } catch (err) {
      setMessage({ ok: false, text: `❌ ${errorText(err)}` });
    } finally {
      setSaving(false);
    }
  }

  const sleep = log.data?.auto?.sleep as Record<string, unknown> | undefined;

  return (
    <form className="stack" onSubmit={handleSave}>
      <PageHeader
        title="CHECK-IN"
        subtitle={day}
        action={
          <div className="row">
            {["Today", "Yesterday"].map((label, i) => (
              <button type="button" key={label} className={`chip ${offset === i ? "on" : ""}`} onClick={() => setOffset(i)}>{label}</button>
            ))}
          </div>
        }
      />
      {sleep?.bed !== undefined && (
        <p className="muted small" style={{ margin: 0 }}>
          {sleep.estimated ? "Phone estimate" : "Measured"}: asleep {String(sleep.bed)} → {String(sleep.wake)} ({String(sleep.hours)}h)
        </p>
      )}
      {log.error && <p className="form-error">{log.error}</p>}
      <div className="grid grid-2">
        {Object.entries(SECTIONS).map(([section, title]) => (
          <Card key={section} title={title}>
            {FIELDS.filter((f) => f.section === section).map((f) => {
              const phone = shown(log.data ?? null, "auto", f);
              return f.kind === "yesno" ? (
                <div key={id(f)} className="row spread">
                  <span className="small">{f.label}</span>
                  <div className="row" style={{ gap: "0.4rem" }}>
                    {[["true", "Yes"], ["false", "No"]].map(([value, label]) => (
                      <button type="button" key={value} className={`chip ${values[id(f)] === value ? "on" : ""}`}
                        onClick={() => setValues({ ...values, [id(f)]: values[id(f)] === value ? "" : value })}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <label key={id(f)} className="field">
                  {f.label}
                  <input
                    inputMode="decimal"
                    value={values[id(f)] ?? ""}
                    placeholder={phone !== undefined ? `Phone: ${phone}` : ""}
                    onChange={(e) => setValues({ ...values, [id(f)]: e.target.value })}
                  />
                  {phone !== undefined && <span className="hint">Phone says {phone}; type to correct it</span>}
                </label>
              );
            })}
          </Card>
        ))}
      </div>
      <div className="row">
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save check-in"}</button>
        {message && <span className={message.ok ? "form-success" : "form-error"}>{message.text}</span>}
      </div>
    </form>
  );
}
