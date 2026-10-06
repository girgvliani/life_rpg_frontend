import type { ReactNode } from "react";

export function Card({ title, action, children, className = "" }: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="row spread">
          {title && <span className="section-title">{title}</span>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="muted small">{subtitle}</div>}
      </div>
      {action}
    </header>
  );
}

/** A progress bar. `tick` marks a point on it, e.g. the chart's A edge. */
export function Meter({ value, max = 1, tick, tone, color }: {
  value: number;
  max?: number;
  tick?: number;
  tone?: "good" | "over";
  color?: string; // a stat's own color; the accent otherwise
}) {
  const fraction = Math.max(0, Math.min(1, value / max));
  const fill = color ? { background: `linear-gradient(90deg, color-mix(in srgb, ${color} 70%, transparent), ${color})` } : {};
  return (
    <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className={`meter-fill ${tone ?? ""}`} style={{ width: `${fraction * 100}%`, ...fill }} />
      {tick !== undefined && <div className="meter-tick" style={{ left: `${(tick / max) * 100}%` }} />}
    </div>
  );
}

/** Loading, error, or the content once the data is in. */
export function Loaded<T>({ load, children }: { load: { data: T | null; error: string | null; reload: () => void }; children: (data: T) => ReactNode }) {
  if (load.error && !load.data) {
    return (
      <Card>
        <p className="form-error">{load.error}</p>
        <div>
          <button className="ghost" onClick={load.reload}>Try again</button>
        </div>
      </Card>
    );
  }
  if (!load.data) return <div className="page-loading">Loading…</div>;
  return <>{children(load.data)}</>;
}
