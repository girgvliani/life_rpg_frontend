import { useState, type FormEvent } from "react";
import { acceptFriend, addFriend, dropFriendRequest, getFriends, getLeaderboard, removeFriend, updateSharing } from "../api/endpoints";
import type { FriendView, FriendsOverview } from "../api/types";
import { Card, Loaded, Meter, PageHeader } from "../components/ui";
import { categoryIcon } from "../lib/categories";
import { errorText, useLoad } from "../lib/load";
import { rankColor } from "../lib/ranks";

/** The four sharing switches: what a friend then sees */
const SWITCHES: [keyof FriendsOverview["sharing"], string, string][] = [
  ["level", "Level, XP and rank", "Your LV, title, XP and XP this week"],
  ["stats", "Categories and stats", "TOTAL, the 6 categories and 9 stats, and how TOTAL moved this week"],
  ["streaks", "Streaks", "Your current and best streaks"],
  ["goals", "Goals and progress", "Goal names and how far along you are, never the numbers (like your weight)"],
];

/** A leaderboard column: the value for a row (undefined = not shared) and how to show it */
interface Board {
  key: string;
  label: string;
  value: (f: FriendView) => number | null | undefined;
  show: (n: number) => string;
}

const CATEGORY_NAMES: [string, string][] = [
  ["mental", "Mental"], ["physical", "Physical"], ["practical", "Practical"], ["cultural", "Cultural"], ["discipline", "Discipline"], ["social", "Social"],
];

const BOARDS: Board[] = [
  { key: "level", label: "Level", value: (f) => f.level?.level, show: (n) => `LV ${n}` },
  { key: "total", label: "TOTAL", value: (f) => f.stats?.total, show: (n) => String(n) },
  { key: "week_xp", label: "XP this week", value: (f) => f.level?.week_xp, show: (n) => `+${n} XP` },
  { key: "improved", label: "Most improved", value: (f) => f.stats?.total_change, show: (n) => (n > 0 ? `▲${n}` : n < 0 ? `▼${-n}` : "±0") },
  ...CATEGORY_NAMES.map(([key, name]): Board => ({
    key, label: `${categoryIcon(key)} ${name}`, value: (f) => f.stats?.categories.find((c) => c.key === key)?.score, show: (n) => String(n),
  })),
];

/** Friends you choose, sharing only what you switch on, compared on a leaderboard and on weekly progress. */
export function FriendsPage() {
  const data = useLoad(async () => {
    const [overview, board] = await Promise.all([getFriends(), getLeaderboard()]);
    return { overview, board };
  });
  const [who, setWho] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [boardKey, setBoardKey] = useState("level");

  async function act(action: () => Promise<string | null>) {
    try {
      const text = await action();
      setMessage(text ? { ok: true, text } : null);
    } catch (err) {
      setMessage({ ok: false, text: `❌ ${errorText(err)}` });
    }
    data.reload();
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const target = who;
    await act(async () => {
      const result = await addFriend(target);
      setWho("");
      return result.status === "accepted" ? `✓ You're friends with ${result.name} now` : `✓ Request sent to ${result.name}; it's waiting for them`;
    });
  }

  return (
    <div className="stack">
      <PageHeader title="FRIENDS" subtitle="Compare with friends you choose. They only see what you switch on." />
      <Loaded load={data}>
        {({ overview, board }) => {
          const metric = BOARDS.find((b) => b.key === boardKey)!;
          const ranked = board.filter((f) => metric.value(f) != null).sort((a, b) => metric.value(b)! - metric.value(a)!);
          const hidden = board.filter((f) => metric.value(f) == null);
          return (
            <div className="grid split-left" style={{ alignItems: "start" }}>
              <div className="stack">
                <div className="section-title">Leaderboard</div>
                <div className="row wrap" style={{ gap: "0.4rem" }}>
                  {BOARDS.map((b) => (
                    <button key={b.key} className={`chip ${boardKey === b.key ? "on" : ""}`} onClick={() => setBoardKey(b.key)}>{b.label}</button>
                  ))}
                </div>
                <Card>
                  {ranked.map((f, i) => (
                    <div key={f.id} className="row">
                      <strong style={{ width: 32, color: "var(--text-muted)" }}>{["🥇", "🥈", "🥉"][i] ?? i + 1}</strong>
                      <span className="grow" style={{ fontWeight: f.me ? 800 : 400, color: f.me ? "var(--accent)" : undefined }}>
                        {f.name}{f.me ? " (you)" : ""}
                      </span>
                      <strong className="num">{metric.show(metric.value(f)!)}</strong>
                    </div>
                  ))}
                  {ranked.length <= 1 && hidden.length === 0 && <span className="muted small">Add friends to see where you stand.</span>}
                  {hidden.map((f) => (
                    <div key={f.id} className="row muted">
                      <span style={{ width: 32 }}>–</span>
                      <span className="grow">{f.name}</span>
                      <span className="small">not shared</span>
                    </div>
                  ))}
                </Card>

                {overview.friends.length === 0 && <Card><span className="muted">No friends yet. Share your code, or add theirs.</span></Card>}
                <div className="grid grid-2" style={{ alignItems: "start" }}>
                  {overview.friends.map((f) => (
                    <FriendCard key={f.id} friend={f} onRemove={() =>
                      confirm(`Unfriend ${f.name}?\n\nYou stop seeing each other's shared data.`) && act(async () => { await removeFriend(f.id); return `Unfriended ${f.name}`; })} />
                  ))}
                </div>
              </div>

              <div className="stack">
                <Card title="Your friend code">
                  <div className="row">
                    <strong className="grow friend-code">{overview.code}</strong>
                    <button className="ghost" onClick={() => navigator.clipboard.writeText(overview.code).then(() => setMessage({ ok: true, text: "✓ Code copied" }))}>Copy</button>
                  </div>
                  <form className="stack" style={{ gap: "0.5rem" }} onSubmit={send}>
                    <label className="field">Add a friend<input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Their friend code or email" /></label>
                    <button type="submit" disabled={!who.trim()}>Send request</button>
                  </form>
                  {message && <span className={message.ok ? "form-success" : "form-error"}>{message.text}</span>}
                </Card>

                {(overview.incoming.length > 0 || overview.outgoing.length > 0) && (
                  <Card title="Requests">
                    {overview.incoming.map((r) => (
                      <div key={r.request_id} className="row">
                        <div className="grow"><strong>{r.name}</strong><div className="muted small">wants to be friends · {r.code}</div></div>
                        <button onClick={() => act(async () => { await acceptFriend(r.request_id); return `✓ You're friends with ${r.name}`; })}>Accept</button>
                        <button className="ghost" onClick={() => act(async () => { await dropFriendRequest(r.request_id); return "Declined"; })}>Decline</button>
                      </div>
                    ))}
                    {overview.outgoing.map((r) => (
                      <div key={r.request_id} className="row">
                        <div className="grow"><strong>{r.name}</strong><div className="muted small">waiting for them · {r.code}</div></div>
                        <button className="ghost" onClick={() => act(async () => { await dropFriendRequest(r.request_id); return "Request taken back"; })}>Cancel</button>
                      </div>
                    ))}
                  </Card>
                )}

                <SharingCard initial={overview.sharing} onError={(text) => setMessage({ ok: false, text })} onSaved={data.reload} />
              </div>
            </div>
          );
        }}
      </Loaded>
    </div>
  );
}

/** The switches flip at once; if saving fails they flip back and say why */
function SharingCard({ initial, onError, onSaved }: {
  initial: FriendsOverview["sharing"];
  onError: (text: string) => void;
  onSaved: () => void;
}) {
  const [sharing, setSharing] = useState(initial);
  async function flip(key: keyof FriendsOverview["sharing"], on: boolean) {
    setSharing((s) => ({ ...s, [key]: on }));
    try {
      await updateSharing({ [key]: on });
      onSaved();
    } catch (err) {
      setSharing((s) => ({ ...s, [key]: !on }));
      onError(`❌ ${errorText(err)}`);
    }
  }
  return (
    <Card title="What your friends see">
      {SWITCHES.map(([key, title, detail]) => (
        <label key={key} className="row switch-row">
          <div className="grow"><strong>{title}</strong><div className="muted small">{detail}</div></div>
          <input type="checkbox" role="switch" checked={sharing[key]} onChange={(e) => flip(key, e.target.checked)} />
        </label>
      ))}
      <span className="muted small">All off = friends see only your name.</span>
    </Card>
  );
}

function FriendCard({ friend, onRemove }: { friend: FriendView; onRemove: () => void }) {
  const shares = friend.level || friend.stats || friend.streaks || friend.goals;
  return (
    <Card>
      <div className="row">
        <div className="grow">
          <strong style={{ fontSize: "1.1rem" }}>{friend.name}</strong>
          <div className="muted small friend-code-small">{friend.code}</div>
        </div>
        {friend.level && <span className="lv-pill">LV {friend.level.level}</span>}
      </div>
      {friend.level && (
        <span className="muted small">{friend.level.title} · {friend.level.xp.toLocaleString("en-US")} XP · +{friend.level.week_xp} this week</span>
      )}
      {friend.stats && (
        <>
          <div className="row">
            <strong>TOTAL {friend.stats.total ?? "–"}</strong>
            <span className="rank" style={{ color: rankColor(friend.stats.total_grade) }}>{friend.stats.total_grade}</span>
            {friend.stats.total_change !== null && (
              <span className="small" style={{ color: friend.stats.total_change >= 0 ? "var(--good)" : "var(--bad)" }}>
                {friend.stats.total_change >= 0 ? "▲" : "▼"}{Math.abs(friend.stats.total_change)} this week
              </span>
            )}
          </div>
          <div className="friend-categories">
            {friend.stats.categories.map((c) => (
              <span key={c.key} className="small" style={{ color: rankColor(c.grade) }}>{categoryIcon(c.key)} {c.score ?? "–"} {c.grade ?? ""}</span>
            ))}
          </div>
        </>
      )}
      {friend.streaks && friend.streaks.some((s) => s.current > 0) && (
        <span className="small">{friend.streaks.filter((s) => s.current > 0).map((s) => `${s.emoji} ${s.current}`).join("   ")}</span>
      )}
      {friend.goals?.map((g, i) => (
        <div key={i} className="stack" style={{ gap: "0.25rem" }}>
          <div className="row spread small"><span>{g.title}</span><strong>{g.achieved ? "🏆" : `${Math.round((g.progress ?? 0) * 100)}%`}</strong></div>
          <Meter value={g.progress ?? 0} tone={g.achieved ? "good" : undefined} />
        </div>
      ))}
      {!shares && <span className="muted small">{friend.name} isn't sharing anything yet.</span>}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="danger" onClick={onRemove}>Unfriend</button>
      </div>
    </Card>
  );
}
