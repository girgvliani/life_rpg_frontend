import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createDevice, getDevices, getIncome, getProfile, revokeDevice, updateIncome, updateProfile } from "../api/endpoints";
import type { Device, Income, Profile } from "../api/types";
import { Card, Loaded, PageHeader } from "../components/ui";
import { errorText, useLoad } from "../lib/load";

export function SettingsPage() {
  const navigate = useNavigate();
  const data = useLoad(async () => {
    const [profile, income] = await Promise.all([getProfile(), getIncome()]);
    return { profile, income };
  });
  return (
    <div className="stack">
      <PageHeader title="SETTINGS" subtitle="The formulas are shared; these targets are yours" />
      <Loaded load={data}>
        {({ profile, income }) => <ProfileForm profile={profile} income={income} onSaved={data.reload} />}
      </Loaded>
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Devices />
        <Card title="🌳 Skills">
          <span className="muted small">Your skills, their levels and XP have their own page now: add, rename or delete them there.</span>
          <button className="ghost" onClick={() => navigate("/skills")}>Open Skills</button>
        </Card>
      </div>
    </div>
  );
}

function ProfileForm({ profile, income, onSaved }: { profile: Profile; income: Income; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [sex, setSex] = useState(profile.sex);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setForm({
      display_name: profile.display_name ?? "",
      currency: profile.currency,
      pushup_target: String(profile.pushup_target),
      steps_target: String(profile.steps_target),
      sleep_target: String(profile.sleep_target),
      height_cm: profile.height_cm ? String(profile.height_cm) : "",
      birth_year: profile.birth_year ? String(profile.birth_year) : "",
      monthly_goal: income.monthly_goal ? String(income.monthly_goal) : "",
      current_month_earnings: String(income.current_month_earnings),
    });
    setSex(profile.sex);
  }, [profile, income]);

  const field = (key: string, label: string, hint?: string) => (
    <label className="field">
      {label}
      <input value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} inputMode={key === "display_name" || key === "currency" ? "text" : "decimal"} />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const number = (key: string) => (form[key] ? Number(form[key]) : undefined);
    try {
      await updateProfile({
        display_name: form.display_name || undefined,
        currency: form.currency.toUpperCase(),
        pushup_target: number("pushup_target"),
        steps_target: number("steps_target"),
        sleep_target: number("sleep_target"),
        height_cm: number("height_cm"),
        birth_year: number("birth_year"),
        sex: sex ?? undefined,
      } as Partial<Profile>);
      await updateIncome({
        current_month_earnings: number("current_month_earnings") ?? 0,
        ...(form.monthly_goal ? { monthly_goal: Number(form.monthly_goal) } : {}),
      });
      setMessage({ ok: true, text: "✅ Saved" });
      onSaved();
    } catch (err) {
      setMessage({ ok: false, text: `❌ ${errorText(err)}` });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-3">
        <Card title="You">
          {field("display_name", "Name on your card")}
          {field("currency", "Currency", "GEL, USD, EUR…")}
          <span className="muted small">Timezone: {profile.timezone}</span>
        </Card>
        <Card title="Daily targets">
          {field("pushup_target", "Push-ups a day")}
          {field("steps_target", "Steps a day")}
          {field("sleep_target", "Sleep (hours a night)", "Sets MP's sleep debt")}
        </Card>
        <Card title="Body & money">
          {field("height_cm", "Height (cm)")}
          {field("birth_year", "Birth year")}
          <div className="row spread">
            <span className="small muted">Sex</span>
            <div className="row" style={{ gap: "0.4rem" }}>
              {(["male", "female"] as const).map((s) => (
                <button type="button" key={s} className={`chip ${sex === s ? "on" : ""}`} onClick={() => setSex(s)}>{s === "male" ? "Male" : "Female"}</button>
              ))}
            </div>
          </div>
          {field("monthly_goal", `Monthly income goal (${profile.currency})`, "Needed for Wealth")}
          {field("current_month_earnings", `Earned this month (${profile.currency})`)}
        </Card>
      </div>
      <div className="row" style={{ marginTop: "1rem" }}>
        <button type="submit">Save profile</button>
        {message && <span className={message.ok ? "form-success" : "form-error"}>{message.text}</span>}
      </div>
    </form>
  );
}

/** Tokens for the phone app (it can also sign in by itself) or anything else that syncs. */
function Devices() {
  const devices = useLoad(getDevices);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setCreated(await createDevice(name.trim()));
      setName("");
      devices.reload();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function handleRevoke(device: Device) {
    if (!confirm(`Revoke ${device.name}? It stops syncing until it gets a new token.`)) return;
    await revokeDevice(device.id);
    devices.reload();
  }

  return (
    <Card title="📱 Devices">
      <form className="inline-form" onSubmit={handleCreate}>
        <input placeholder="Device name, e.g. Galaxy S23" value={name} onChange={(e) => setName(e.target.value)} required />
        <button type="submit">New token</button>
      </form>
      {created?.token && (
        <div className="tile">
          <span className="small">Token for <strong>{created.name}</strong>. Copy it now, it won't be shown again:</span>
          <code style={{ overflowWrap: "anywhere", color: "var(--accent)" }}>{created.token}</code>
          <div><button className="ghost" onClick={() => navigator.clipboard.writeText(created.token!)}>Copy</button></div>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      {devices.data?.map((d) => (
        <div key={d.id} className="list-row">
          <div>
            <strong>{d.name}</strong>
            <div className="muted small">last used {d.last_used_at ? new Date(d.last_used_at).toLocaleString() : "never"}</div>
          </div>
          <button className="danger" onClick={() => handleRevoke(d)}>Revoke</button>
        </div>
      ))}
      {devices.data?.length === 0 && <span className="muted small">No devices yet. The phone app creates its own when you sign in there.</span>}
    </Card>
  );
}
