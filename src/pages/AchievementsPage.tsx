import { useState } from "react";
import { getAchievements, wearTitle } from "../api/endpoints";
import type { AchievementItem, Achievements, AchievementStory } from "../api/types";
import { HexBadge, TIER_NAMES, tierColor } from "../components/Badges";
import { Choice } from "../components/forms";
import { Card, Loaded, Meter, PageHeader } from "../components/ui";
import { useLevel } from "../context/LevelContext";
import { errorText, useLoad } from "../lib/load";

/** Your achievements: stories (paths of chapters, with what's next) and every badge, with how to get it. */
export function AchievementsPage() {
  const { refresh } = useLevel();
  const data = useLoad(async () => {
    const all = await getAchievements();
    refresh(); // anything just earned pops up
    return all;
  });
  const [tab, setTab] = useState<"stories" | "badges">("stories");
  const [open, setOpen] = useState<AchievementItem | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function wear(key: string | null, title?: string | null) {
    try {
      await wearTitle(key);
      setMessage({ ok: true, text: key ? `Now wearing “${title}”` : "Back to your level title" });
      data.reload();
    } catch (err) {
      setMessage({ ok: false, text: `❌ ${errorText(err)}` });
    }
    setOpen(null);
  }

  return (
    <div className="stack">
      <PageHeader title="ACHIEVEMENTS" subtitle="Badges from what the app can check: how to get each one, its XP, and the stories they belong to." />
      <Loaded load={data}>
        {(all) => {
          const item = (key: string) => all.achievements.find((a) => a.key === key)!;
          const worn = all.title ? item(all.title)?.title : null;
          return (
            <>
              <Card>
                <div className="row" style={{ gap: "1rem" }}>
                  <HexBadge icon="🏆" tier={3} earned={all.earned > 0} size={72} label="Achievements" />
                  <div className="grow stack" style={{ gap: "0.35rem" }}>
                    <strong style={{ fontSize: "1.8rem" }} className="num">{all.earned} / {all.total}</strong>
                    <Meter value={all.earned} max={all.total} color="var(--gold)" />
                    <span className="muted small">+{all.xp.toLocaleString("en-US")} XP from achievements</span>
                  </div>
                </div>
                <span className="small" style={{ color: worn ? "var(--gold)" : "var(--text-muted)", fontWeight: worn ? 700 : 400 }}>
                  {worn ? `Wearing the title “${worn}”` : "Earn a badge with a title (like “Jr. Goggins”) and wear it next to your name."}
                </span>
                {message && <span className={message.ok ? "form-success" : "form-error"}>{message.text}</span>}
              </Card>
              <Choice options={[["stories", "📖 Stories"], ["badges", "🏅 All badges"]]} value={tab} onChange={setTab} />
              {tab === "stories" ? (
                <div className="grid grid-2" style={{ alignItems: "start" }}>
                  {all.stories.map((s) => <StoryCard key={s.key} story={s} all={all} onOpen={setOpen} />)}
                </div>
              ) : (
                all.stories.map((s) => (
                  <Card key={s.key} title={`${s.icon} ${s.name} · ${s.done}/${s.chapters.length}`}>
                    <div className="badge-grid">
                      {s.chapters.map((k) => {
                        const a = item(k);
                        return (
                          <button key={k} className="badge-tile" onClick={() => setOpen(a)}>
                            <HexBadge icon={a.icon} tier={a.tier} earned={!!a.earned_at} size={68} label={a.name} />
                            <span className={a.earned_at ? "" : "muted"}>{a.name}</span>
                            {!a.earned_at && a.progress > 0 && <Meter value={a.progress} color={tierColor(a.tier)} />}
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                ))
              )}
              {open && (
                <div className="modal-backdrop" onClick={() => setOpen(null)}>
                  <div className="modal card achievement-detail" role="dialog" aria-label={open.name} onClick={(e) => e.stopPropagation()}>
                    <Detail item={open} wearing={all.title === open.key} onWear={wear} />
                    <button className="ghost" onClick={() => setOpen(null)}>Close</button>
                  </div>
                </div>
              )}
            </>
          );
        }}
      </Loaded>
    </div>
  );
}

function StoryCard({ story, all, onOpen }: { story: AchievementStory; all: Achievements; onOpen: (a: AchievementItem) => void }) {
  const chapters = story.chapters.map((k) => all.achievements.find((a) => a.key === k)!);
  const next = chapters.find((a) => a.key === story.next);
  return (
    <Card>
      <div className="row">
        <span style={{ fontSize: "1.8rem" }} aria-hidden>{story.icon}</span>
        <div className="grow">
          <strong style={{ letterSpacing: "0.05em" }}>{story.name.toUpperCase()}</strong>
          <div className="muted small">{story.done} of {chapters.length} chapters</div>
        </div>
        {story.done === chapters.length && <strong className="small" style={{ color: "var(--gold)" }}>COMPLETE</strong>}
      </div>
      <span className="muted small">{story.blurb}</span>
      <div className="story-path">
        {chapters.map((a, i) => (
          <span key={a.key} className="row" style={{ gap: 0 }}>
            {i > 0 && <span className={`story-link ${a.earned_at ? "lit" : ""}`} />}
            <button className="link" onClick={() => onOpen(a)} title={a.name}>
              <HexBadge icon={a.icon} tier={a.tier} earned={!!a.earned_at} size={48} label={a.name} />
            </button>
          </span>
        ))}
      </div>
      {next && (
        <button className="story-next" onClick={() => onOpen(next)}>
          <div className="row spread">
            <strong className="small" style={{ color: "var(--accent)", letterSpacing: "0.05em" }}>NEXT · {next.name.toUpperCase()}</strong>
            <strong className="small" style={{ color: "var(--good)" }}>+{next.xp} XP</strong>
          </div>
          <span className="small">{next.how}</span>
          {next.target > 1 && (
            <>
              <Meter value={next.progress} color={tierColor(next.tier)} />
              <span className="muted small">{progressText(next)}</span>
            </>
          )}
          {next.title && <strong className="small" style={{ color: "var(--gold)" }}>Unlocks the title “{next.title}”</strong>}
        </button>
      )}
    </Card>
  );
}

export function progressText(a: AchievementItem) {
  const show = (v: number) => (Number.isInteger(v) ? v.toLocaleString("en-US") : v.toFixed(1));
  return `${show(Math.min(a.value, a.target))} / ${show(a.target)} ${a.unit}`.trim();
}

function Detail({ item, wearing, onWear }: { item: AchievementItem; wearing: boolean; onWear: (key: string | null, title?: string | null) => void }) {
  const earned = !!item.earned_at;
  return (
    <div className="stack" style={{ alignItems: "center", textAlign: "center", gap: "0.5rem" }}>
      <HexBadge icon={item.icon} tier={item.tier} earned={earned} size={128} label={item.name} />
      <h2 style={{ margin: 0, letterSpacing: "0.04em" }}>{item.name.toUpperCase()}</h2>
      <strong className="small" style={{ color: tierColor(item.tier) }}>{TIER_NAMES[item.tier]} · +{item.xp} XP</strong>
      <span>{item.how}</span>
      {earned ? (
        <strong className="small" style={{ color: "var(--good)" }}>✅ Earned {item.earned_at!.slice(0, 10)}</strong>
      ) : item.target > 1 ? (
        <div className="stack" style={{ width: "100%", gap: "0.3rem" }}>
          <Meter value={item.progress} color={tierColor(item.tier)} />
          <span className="muted small">{progressText(item)}</span>
        </div>
      ) : (
        <span className="muted small">Not earned yet</span>
      )}
      {item.title && (
        <>
          <strong style={{ color: "var(--gold)" }}>Title: “{item.title}”</strong>
          {!earned ? (
            <span className="muted small">Earn it to wear this title next to your name</span>
          ) : wearing ? (
            <button className="ghost" onClick={() => onWear(null)}>Take it off</button>
          ) : (
            <button onClick={() => onWear(item.key, item.title)}>Wear this title</button>
          )}
        </>
      )}
    </div>
  );
}
