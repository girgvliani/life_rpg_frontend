import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getLevel } from "../api/endpoints";
import type { Level } from "../api/types";
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
      {levelUp && (
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
