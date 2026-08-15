export function XpBar({ level, xp }: { level: number; xp: number }) {
  const xpInLevel = xp % 150;
  const progress = (xpInLevel / 150) * 100;

  return (
    <div className="xp-bar">
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="xp-bar-label">
        Lv {level} · {xpInLevel}/150 XP
      </span>
    </div>
  );
}
