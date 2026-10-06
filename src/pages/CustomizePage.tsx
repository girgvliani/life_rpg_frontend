import { useState } from "react";
import { getCustomization, resetCustomization, setPartOff } from "../api/endpoints";
import type { Customization } from "../api/types";
import { Card, Loaded, PageHeader } from "../components/ui";
import { useLevel } from "../context/LevelContext";
import { errorText, useLoad } from "../lib/load";
import { statColor } from "../lib/stats";

/**
 * Customization, earned by level: what each level unlocks, and the settings for what's unlocked.
 * Your own pages use your settings; comparisons with others use the standard stats.
 */
export function CustomizePage() {
  const data = useLoad(getCustomization);
  return (
    <div className="stack">
      <PageHeader
        title="CUSTOMIZE"
        subtitle="Shape your stats your way. Each level milestone unlocks something new. Leaderboards always use the standard stats, so comparisons stay fair."
      />
      <Loaded load={data}>{(custom) => <Customize initial={custom} />}</Loaded>
    </div>
  );
}

function Customize({ initial }: { initial: Customization }) {
  const [custom, setCustom] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const { refresh: refreshLevel } = useLevel();
  const partsOff = custom.ladder.find((u) => u.key === "parts_off");

  async function apply(action: () => Promise<Customization>) {
    setError(null);
    try {
      setCustom(await action());
      refreshLevel();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="grid split-left" style={{ alignItems: "start" }}>
      <div className="stack">
        <Card>
          <div className="row">
            <span className="lv-pill">LV {custom.level}</span>
            <div className="grow">
              <strong>You're LV {custom.level}</strong>
              <div className="muted small">{custom.next ? `Next unlock at LV ${custom.next.level}: ${custom.next.title}` : "Everything is unlocked"}</div>
            </div>
          </div>
        </Card>

        {partsOff?.unlocked ? (
          <>
            <div className="section-title">Turn parts off · a stat is judged on the parts you keep</div>
            {error && <p className="form-error">{error}</p>}
            <div className="grid grid-2" style={{ alignItems: "start" }}>
              {custom.stats.map((stat) => {
                const off = custom.off[stat.code] ?? [];
                return (
                  <Card key={stat.code}>
                    <div className="row">
                      <strong style={{ color: statColor(stat.code), width: 44 }}>{stat.code}</strong>
                      <strong className="grow">{stat.name}</strong>
                      {off.length > 0 && <span className="small" style={{ color: "var(--accent)" }}>{off.length} off</span>}
                    </div>
                    {stat.parts.map((part) => {
                      const on = !off.includes(part.name);
                      const last = on && stat.parts.length - off.length <= 1;
                      return (
                        <label key={part.name} className="row switch-row" title={last ? "Keep at least one part on" : undefined}>
                          <div className="grow">
                            <span style={{ color: on ? undefined : "var(--text-muted)" }}>{part.name}</span>
                            <div className="muted small">counts {Math.round(part.weight)}</div>
                          </div>
                          <input type="checkbox" role="switch" checked={on} disabled={last}
                            onChange={(e) => apply(() => setPartOff(stat.code, part.name, !e.target.checked))} />
                        </label>
                      );
                    })}
                  </Card>
                );
              })}
            </div>
            {Object.keys(custom.off).length > 0 && (
              <button className="danger" style={{ alignSelf: "flex-start" }}
                onClick={() => confirm("Back to the standard stats? Every part you turned off counts again.") && apply(resetCustomization)}>
                Back to the standard stats
              </button>
            )}
          </>
        ) : (
          <Card><span className="muted">Your first customization, turning parts of a stat off, unlocks at LV {partsOff?.level}.</span></Card>
        )}
      </div>

      <Card title="Unlocks">
        {custom.ladder.map((u) => (
          <div key={u.key} className="row" style={{ alignItems: "flex-start" }}>
            <span style={{ width: 26 }}>{u.unlocked ? "✅" : "🔒"}</span>
            <strong style={{ width: 70, color: u.unlocked ? "var(--accent)" : "var(--text-muted)" }}>LV {u.level}</strong>
            <div className="grow">
              <strong style={{ color: u.unlocked ? undefined : "var(--text-muted)" }}>{u.title}</strong>
              <div className="muted small">{u.description}{u.unlocked && !u.ready ? " Arrives in an update." : ""}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
