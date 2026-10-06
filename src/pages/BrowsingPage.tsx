import { useMemo, useState } from "react";
import { getSiteGroups, saveBrowsingDays, saveSiteGroups } from "../api/endpoints";
import { Card, Loaded, Meter, PageHeader } from "../components/ui";
import { isoDay, longDate } from "../lib/dates";
import {
  CATEGORIES, CATEGORY_LABELS, type Category, type Visit, guess, hm, parseHistory, searchTerms, summarize, toBrowserSection,
} from "../lib/browsing";
import { errorText, useLoad } from "../lib/load";

const RANGES: [number | null, string][] = [[7, "Last 7 days"], [30, "Last 30 days"], [90, "Last 90 days"], [null, "Everything"]];
const SHOWN_SITES = 60;

/**
 * Chrome history, grouped: upload the Takeout export, give each site a category ("localhost:3000" →
 * Work), and save each day's minutes per category. The history itself stays on this page.
 */
export function BrowsingPage() {
  const saved = useLoad(getSiteGroups);
  return (
    <div className="stack">
      <PageHeader
        title="BROWSING"
        subtitle="Where your time in Chrome goes. Your history is read on this page only; just each day's totals are saved."
      />
      <Loaded load={saved}>{(groups) => <Browsing savedGroups={groups.groups} onSaved={saved.reload} />}</Loaded>
    </div>
  );
}

function Browsing({ savedGroups, onSaved }: { savedGroups: Record<string, string>; onSaved: () => void }) {
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number | null>(30);
  const [groups, setGroups] = useState<Record<string, Category>>(savedGroups as Record<string, Category>);
  const [changed, setChanged] = useState(false);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const categoryOf = (site: string): Category => groups[site] ?? guess(site);
  const shown = useMemo(() => {
    if (!visits) return [];
    if (days === null) return visits;
    const from = new Date(`${isoDay(days - 1)}T00:00:00`).getTime();
    return visits.filter((v) => v.time >= from);
  }, [visits, days]);
  const summary = useMemo(() => summarize(shown, categoryOf), [shown, groups]); // eslint-disable-line react-hooks/exhaustive-deps
  const totals = useMemo(() => {
    const t = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
    for (const d of summary.days) for (const c of CATEGORIES) t[c] += d.ms[c];
    return t;
  }, [summary]);
  const topSearches = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of shown) {
      const q = searchTerms(v.url)?.trim().toLowerCase();
      if (q) counts.set(q, (counts.get(q) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [shown]);

  async function load(file: File | undefined) {
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      const parsed = parseHistory(await file.text());
      if (!parsed.length) throw new Error("That file has no web pages in it.");
      setVisits(parsed);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function setCategory(site: string, category: Category) {
    setGroups((g) => ({ ...g, [site]: category }));
    setChanged(true);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await saveSiteGroups(groups);
      const today = isoDay();
      const rows = summary.days.filter((d) => d.day <= today).map((d) => ({ date: d.day, browser: toBrowserSection(d) }));
      for (let i = 0; i < rows.length; i += 31) await saveBrowsingDays(rows.slice(i, i + 31));
      setChanged(false);
      setMessage({ ok: true, text: `✓ Saved your groups and ${rows.length} day${rows.length === 1 ? "" : "s"}. They show in About you under Browsing.` });
      onSaved();
    } catch (err) {
      setMessage({ ok: false, text: `❌ ${errorText(err)}` });
    } finally {
      setSaving(false);
    }
  }

  if (!visits) {
    return (
      <Card title="Get your Chrome history">
        <ol className="small" style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.7 }}>
          <li>Open <a href="https://takeout.google.com" target="_blank" rel="noreferrer">takeout.google.com</a>, click <strong>Deselect all</strong>, then tick <strong>Chrome</strong> only.</li>
          <li>Create the export and download it when Google emails you (usually a few minutes).</li>
          <li>Unzip it and pick the <strong>.json</strong> file in the <strong>Chrome</strong> folder (BrowserHistory.json or History.json).</li>
        </ol>
        <label className="button upload">
          Choose the file
          <input type="file" accept=".json,application/json" hidden onChange={(e) => load(e.target.files?.[0])} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <span className="muted small">Chrome keeps about 90 days. Import again whenever you like; days already saved are replaced.</span>
      </Card>
    );
  }

  const tracked = CATEGORIES.filter((c) => c !== "ignore");
  const totalMs = tracked.reduce((sum, c) => sum + totals[c], 0) || 1;
  const sites = summary.sites.filter((s) => !filter || s.site.includes(filter.toLowerCase())).slice(0, SHOWN_SITES);
  const recentDays = summary.days.slice(-14).reverse();

  return (
    <div className="stack">
      <div className="row wrap">
        <span className="muted small grow">
          {shown.length.toLocaleString("en-US")} pages, {summary.days.length} days
          {summary.days.length > 0 && ` · ${longDate(summary.days[0].day)} to ${longDate(summary.days[summary.days.length - 1].day)}`}
        </span>
        {RANGES.map(([value, label]) => (
          <button key={label} className={`chip ${days === value ? "on" : ""}`} onClick={() => setDays(value)}>{label}</button>
        ))}
        <button className="ghost" onClick={() => setVisits(null)}>Another file</button>
      </div>

      <div className="grid split-left" style={{ alignItems: "start" }}>
        <div className="stack">
          <Card title="Sites · pick what each one was for">
            <input placeholder="Find a site (e.g. localhost)" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div className="site-table">
              {sites.map((s) => (
                <div key={s.site} className="site-row">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <strong className="ellipsis" style={{ display: "block" }}>{s.site}</strong>
                    <span className="muted small">{s.visits} visits · {hm(s.ms)}{groups[s.site] ? "" : " · guessed"}</span>
                  </div>
                  <select value={categoryOf(s.site)} onChange={(e) => setCategory(s.site, e.target.value as Category)} aria-label={`Category for ${s.site}`}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {summary.sites.length > SHOWN_SITES && !filter && (
              <span className="muted small">Showing the {SHOWN_SITES} sites with the most time of {summary.sites.length}; search to find the rest.</span>
            )}
          </Card>
        </div>

        <div className="stack">
          <Card title="Where the time went">
            {tracked.filter((c) => totals[c] > 0).sort((a, b) => totals[b] - totals[a]).map((c) => (
              <div key={c} className="stack" style={{ gap: "0.2rem" }}>
                <div className="row spread small"><span>{CATEGORY_LABELS[c]}</span><strong>{hm(totals[c])} · {Math.round((totals[c] / totalMs) * 100)}%</strong></div>
                <Meter value={totals[c]} max={totalMs} />
              </div>
            ))}
            <span className="muted small">Estimated: each page counts until your next one (at most 10 min).</span>
            <button onClick={save} disabled={saving}>{saving ? "Saving…" : changed ? "Save groups and days" : "Save days"}</button>
            {message && <span className={message.ok ? "form-success" : "form-error"}>{message.text}</span>}
          </Card>

          <Card title="By day">
            {recentDays.map((d) => {
              const top = tracked.filter((c) => d.ms[c] > 0).sort((a, b) => d.ms[b] - d.ms[a]).slice(0, 3);
              return (
                <div key={d.day} className="row spread small">
                  <span className="muted" style={{ width: 90 }}>{longDate(d.day)}</span>
                  <span className="grow">{top.map((c) => `${CATEGORY_LABELS[c].split(" ")[0]} ${hm(d.ms[c])}`).join("  ·  ")}</span>
                  {d.shorts > 0 && <span title="YouTube Shorts">▶ {d.shorts}</span>}
                </div>
              );
            })}
          </Card>

          {topSearches.length > 0 && (
            <Card title="Top searches">
              {topSearches.map(([q, n]) => (
                <div key={q} className="row spread small"><span className="ellipsis">{q}</span><strong>{n}×</strong></div>
              ))}
              <span className="muted small">Stays on this page; searches aren't saved.</span>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

