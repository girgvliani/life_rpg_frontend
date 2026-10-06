import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createDevice, deletePhoto, getDevices, getIncome, getProfile, revokeDevice, updateIncome, updateProfile, uploadPhoto } from "../api/endpoints";
import { Avatar } from "../components/Badges";
import type { Device, Income, Profile } from "../api/types";
import { Choice } from "../components/forms";
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
        {({ profile, income }) => (
          <>
            <PhotoCard profile={profile} onSaved={data.reload} />
            <ProfileForm profile={profile} income={income} onSaved={data.reload} />
          </>
        )}
      </Loaded>
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Devices />
        <Card title="🎛️ Customize your stats">
          <span className="muted small">Turn parts of a stat off, and more with every level milestone.</span>
          <button className="ghost" onClick={() => navigate("/customize")}>Open Customize</button>
        </Card>
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
  const [publicName, setPublicName] = useState(profile.public_name);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setForm({
      display_name: profile.display_name ?? "",
      nickname: profile.nickname ?? "",
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
    setPublicName(profile.public_name);
  }, [profile, income]);

  const field = (key: string, label: string, hint?: string) => (
    <label className="field">
      {label}
      <input value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} inputMode={["display_name", "nickname", "currency"].includes(key) ? "text" : "decimal"} />
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
        nickname: form.nickname.trim() || undefined,
        public_name: publicName,
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
          {field("nickname", "Nickname")}
          <div className="stack" style={{ gap: "0.3rem" }}>
            <span className="small muted">Friends and the leaderboard see you as</span>
            <Choice options={[["nickname", "Nickname"], ["name", "Your name"], ["code", "Just your code"]]} value={publicName} onChange={setPublicName} />
          </div>
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

/** A square crop of the chosen picture, 512 px JPEG (the server makes it 256 px and drops EXIF) */
async function squarePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = out;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that picture"))), "image/jpeg", 0.9));
}

function PhotoCard({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ ok: true, text: done });
      onSaved();
    } catch (err) {
      setMessage({ ok: false, text: `❌ ${errorText(err)}` });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Profile photo">
      <div className="row" style={{ gap: "1rem" }}>
        <Avatar path={profile.photo_url} name={profile.display_name ?? profile.nickname ?? "?"} size={72} ring />
        <div className="stack" style={{ gap: "0.4rem" }}>
          <label className="button" style={busy ? { opacity: 0.6 } : undefined}>
            {busy ? "Uploading…" : profile.photo_url ? "Change photo" : "Add a photo"}
            <input type="file" accept="image/*" hidden disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) run(async () => uploadPhoto(await squarePhoto(file)), "✅ New photo");
              }} />
          </label>
          {profile.photo_url && <button className="danger" disabled={busy} onClick={() => run(deletePhoto, "Photo removed")}>Remove</button>}
        </div>
      </div>
      <span className="muted small">Friends and the leaderboard see it wherever they see your name; with “Just your code” it's hidden.</span>
      {message && <span className={message.ok ? "form-success" : "form-error"}>{message.text}</span>}
    </Card>
  );
}
