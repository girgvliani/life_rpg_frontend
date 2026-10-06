import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { achievementsSeen, getLevel } from "../api/endpoints";
import type { AchievementBrief, Level } from "../api/types";
import { HexBadge, TIER_NAMES, tierColor } from "../components/Badges";
import { useAuth } from "./AuthContext";

interface LevelContextValue {
  level: Level | null;
  /** Call after anything that can earn XP: shows "+N XP" and celebrates new levels */
  refresh: () => Promise<void>;
}

const LevelContext = createContext<LevelContextValue>({ level: null, refresh: async () => {} });

const SEEN_KEY = "liferpg:last-seen-level";

function lastSeen(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY) ?? -1);
  } catch {
    return -1;
  }
}

function remember(level: number) {
  try {
    localStorage.setItem(SEEN_KEY, String(level));
  } catch {
    // private mode: the celebration may repeat, nothing else breaks
  }
}

export function LevelProvider({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState<Level | null>(null);
  const [gained, setGained] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<Level | null>(null);
  const [unlocked, setUnlocked] = useState<AchievementBrief[]>([]);
  const previous = useRef<Level | null>(null);

  const refresh = useCallback(async () => {
    let fresh: Level;
    try {
      fresh = await getLevel();
    } catch {
      return; // an older server without levels: the rest of the site works without it
    }
    if (previous.current && fresh.xp > previous.current.xp) setGained(fresh.xp - previous.current.xp);
    const seen = lastSeen();
    if (seen >= 0 && fresh.level > seen) setLevelUp(fresh);
    if (seen < 0 || fresh.level > seen) remember(fresh.level);
    if (fresh.new_achievements?.length) setUnlocked(fresh.new_achievements);
    previous.current = fresh;
    setLevel(fresh);
  }, []);

  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      refresh();
    } else {
      previous.current = null;
      setLevel(null);
    }
  }, [user, refresh]);

  useEffect(() => {
    if (gained === null) return;
    const timer = setTimeout(() => setGained(null), 2600);
    return () => clearTimeout(timer);
  }, [gained]);

  return (
    <LevelContext.Provider value={{ level, refresh }}>
      {children}
      {gained !== null && <div className="xp-toast" role="status">⚡ +{gained} XP</div>}
      {unlocked.length > 0 && (
        <UnlockModal
          earned={unlocked}
          onClose={() => {
            setUnlocked([]);
            achievementsSeen().catch(() => {});
          }}
        />
      )}
      {levelUp && unlocked.length === 0 && (
        <div className="modal-backdrop" onClick={() => setLevelUp(null)}>
          <div className="modal card level-up" role="dialog" aria-label="Level up" onClick={(e) => e.stopPropagation()}>
            <div className="section-title" style={{ color: "var(--accent)" }}>⬆️ Level up!</div>
            <div className="lv-badge big">
              <span>LV</span>
              <strong>{levelUp.level}</strong>
            </div>
            <h2 style={{ color: "var(--accent)" }}>{levelUp.title.toUpperCase()}</h2>
            <span className="muted small num">
              {levelUp.xp.toLocaleString()} XP · {(levelUp.next_level_xp - levelUp.xp).toLocaleString()} to LV {levelUp.level + 1}
            </span>
            <button onClick={() => setLevelUp(null)}>Stay hard</button>
          </div>
        </div>
      )}
    </LevelContext.Provider>
  );
}

export function useLevel() {
  return useContext(LevelContext);
}

/** Something new earned: the best badge pops in over turning light rays, the rest below */
function UnlockModal({ earned, onClose }: { earned: AchievementBrief[]; onClose: () => void }) {
  const best = [...earned].sort((a, b) => b.tier - a.tier || b.xp - a.xp)[0];
  const rest = earned.filter((a) => a !== best);
  const xp = earned.reduce((sum, a) => sum + a.xp, 0);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card unlock" role="dialog" aria-label="Achievement unlocked" onClick={(e) => e.stopPropagation()}
        style={{ ["--ray" as string]: tierColor(best.tier) }}>
        <div className="section-title" style={{ color: "var(--gold)" }}>
          🏆 {earned.length === 1 ? "Achievement unlocked" : `${earned.length} achievements unlocked`}
        </div>
        <div className="unlock-stage">
          <div className="unlock-rays" aria-hidden />
          <div className="unlock-pop"><HexBadge icon={best.icon} tier={best.tier} earned size={128} label={best.name} /></div>
        </div>
        <h2 style={{ margin: 0, letterSpacing: "0.04em" }}>{best.name.toUpperCase()}</h2>
        <strong className="small" style={{ color: tierColor(best.tier) }}>{TIER_NAMES[best.tier]} · +{best.xp} XP</strong>
        {best.title && <strong className="small" style={{ color: "var(--gold)" }}>New title: “{best.title}” (wear it from Achievements)</strong>}
        {rest.length > 0 && (
          <>
            <div className="row wrap" style={{ justifyContent: "center", gap: "0.4rem" }}>
              {rest.map((a) => <HexBadge key={a.key} icon={a.icon} tier={a.tier} earned size={46} label={a.name} />)}
            </div>
            <span className="muted small">{rest.slice(0, 6).map((a) => a.name).join(" · ")}{rest.length > 6 ? " · …" : ""}</span>
          </>
        )}
        <strong className="unlock-xp num">+{xp.toLocaleString("en-US")} XP</strong>
        <button onClick={onClose}>Stay hard 💪</button>
      </div>
    </div>
  );
}
