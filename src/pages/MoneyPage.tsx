import { useEffect, useState, type FormEvent } from "react";
import { getBabySteps, saveBabySteps } from "../api/endpoints";
import type { BabySteps, BabyStepsPlan } from "../api/types";
import { Choice } from "../components/forms";
import { Card, Loaded, Meter, PageHeader } from "../components/ui";
import { useLevel } from "../context/LevelContext";
import { errorText, useLoad } from "../lib/load";

/** Dave Ramsey's 7 Baby Steps: which one you're on, how far along each is, and your numbers. */
export function MoneyPage() {
  const { refresh: refreshLevel } = useLevel();
  const data = useLoad(getBabySteps);
  const [shown, setShown] = useState<BabySteps | null>(null);
  return (
    <div className="stack">
      <PageHeader
        title="BABY STEPS"
        subtitle="Dave Ramsey's 7 steps, in order: each one counts toward Wealth once every step before it is done (4, 5 and 6 run together)."
      />
      <Loaded load={data}>
        {(loaded) => {
          const steps = shown ?? loaded;
          return (
            <div className="grid split-left">
              <StepList steps={steps} />
              <PlanForm steps={steps} onSaved={(s) => { setShown(s); refreshLevel(); }} />
            </div>
          );
        }}
      </Loaded>
    </div>
  );
}

function StepList({ steps }: { steps: BabySteps }) {
  return (
    <div className="stack">
      {steps.steps.map((s) => (
        <Card key={s.step} className={s.current ? "card-current" : ""}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <strong style={{ fontSize: "1.3rem", width: "2rem", color: s.current ? "var(--accent)" : s.done && s.progress !== "n/a" ? "var(--good)" : "var(--text-muted)" }}>
              {s.progress === "n/a" ? "–" : s.done ? "✅" : s.step}
            </strong>
            <div className="grow stack" style={{ gap: "0.3rem" }}>
              <div className="row spread">
                <strong>{s.title}</strong>
                {s.current && <strong className="small" style={{ color: "var(--accent)" }}>YOU'RE HERE</strong>}
              </div>
              <span className="muted small">{s.detail}</span>
              {s.progress !== "n/a" && <Meter value={s.progress ?? 0} tone={s.done ? "good" : undefined} />}
              <span className="muted small">{s.note}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

type DebtRow = { name: string; balance: string; original: string };

const text = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

/** Your numbers. Debts are listed for the snowball: smallest balance first. */
function PlanForm({ steps, onSaved }: { steps: BabySteps; onSaved: (s: BabySteps) => void }) {
  const p = steps.plan;
  const [form, setForm] = useState<Record<string, string>>({});
  const [months, setMonths] = useState(p.months);
  const [kids, setKids] = useState(p.kids);
  const [home, setHome] = useState(p.home);
  const [giving, setGiving] = useState(p.giving);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setForm({
      saved: text(p.saved),
      starter_target: text(p.starter_target),
      monthly_expenses: text(p.monthly_expenses),
      invest_percent: text(p.invest_percent),
      college_saved: text(p.college_saved),
      college_target: text(p.college_target),
      mortgage_balance: text(p.mortgage_balance),
      mortgage_original: text(p.mortgage_original),
    });
    setMonths(p.months);
    setKids(p.kids);
    setHome(p.home);
    setGiving(p.giving);
    setDebts(p.debts.map((d) => ({ name: d.name, balance: text(d.balance), original: text(d.original) })));
  }, [p]);

  const field = (key: string, label: string, hint?: string) => (
    <label className="field">
      {label}
      <input value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} inputMode="decimal" />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );

  function amount(raw: string | undefined, label: string, required = false): number | undefined {
    const value = (raw ?? "").trim().replace(/,/g, "");
    if (!value) {
      if (required) throw new Error(`${label}: enter an amount`);
      return undefined;
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new Error(`${label}: enter an amount`);
    return n;
  }
  const positive = (n: number | undefined) => (n && n > 0 ? n : undefined);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const plan: Partial<BabyStepsPlan> = {
        saved: amount(form.saved, "Emergency fund saved", true),
        starter_target: positive(amount(form.starter_target, "Starter fund target")),
        monthly_expenses: positive(amount(form.monthly_expenses, "Monthly expenses")),
        months,
        invest_percent: amount(form.invest_percent, "% invested") ?? 0,
        kids,
        home,
        giving,
        debts: debts.filter((d) => d.name.trim()).map((d) => {
          const original = positive(amount(d.original, `${d.name} started at`, true));
          if (!original) throw new Error(`${d.name}: what it started at`);
          return { name: d.name.trim(), balance: amount(d.balance, `${d.name} left`, true)!, original };
        }),
      };
      if (kids) {
        plan.college_saved = amount(form.college_saved, "College fund saved");
        plan.college_target = positive(amount(form.college_target, "College fund target"));
      }
      if (home === "mortgage") {
        plan.mortgage_balance = amount(form.mortgage_balance, "Mortgage left");
        plan.mortgage_original = positive(amount(form.mortgage_original, "Mortgage started at"));
      }
      onSaved(await saveBabySteps(plan));
      setMessage({ ok: true, text: "✅ Saved" });
    } catch (err) {
      setMessage({ ok: false, text: `❌ ${err instanceof Error && !("status" in err) ? err.message : errorText(err)}` });
    }
  }

  const setDebt = (i: number, change: Partial<DebtRow>) => setDebts(debts.map((d, j) => (j === i ? { ...d, ...change } : d)));

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Card title={`Steps 1 and 3 · emergency fund (${steps.currency})`}>
        {field("saved", "Emergency fund saved")}
        {field("starter_target", "Starter fund target", "Ramsey's is $1,000")}
        {field("monthly_expenses", "Monthly expenses")}
        <span className="small muted">Full fund: months of expenses</span>
        <Choice options={[3, 4, 5, 6].map((m) => [m, `${m} months`] as [number, string])} value={months} onChange={setMonths} />
      </Card>
      <Card title="Step 2 · debts (not the house)">
        {debts.map((d, i) => (
          <div key={i} className="stack" style={{ gap: "0.4rem" }}>
            <input placeholder="Debt, e.g. Credit card" value={d.name} onChange={(e) => setDebt(i, { name: e.target.value })} aria-label="Debt" />
            <div className="row" style={{ gap: "0.5rem" }}>
              <input placeholder="Left" inputMode="decimal" value={d.balance} onChange={(e) => setDebt(i, { balance: e.target.value })} aria-label="Left" style={{ flex: 1, minWidth: 0 }} />
              <input placeholder="Started at" inputMode="decimal" value={d.original} onChange={(e) => setDebt(i, { original: e.target.value })} aria-label="Started at" style={{ flex: 1, minWidth: 0 }} />
              <button type="button" className="danger" onClick={() => setDebts(debts.filter((_, j) => j !== i))}>Remove</button>
            </div>
          </div>
        ))}
        <div><button type="button" className="ghost" onClick={() => setDebts([...debts, { name: "", balance: "", original: "" }])}>+ Add a debt</button></div>
        {debts.length === 0 && <span className="muted small">No debts? Step 2 is already done.</span>}
      </Card>
      <Card title="Steps 4-7">
        {field("invest_percent", "% of income invested for retirement", "Ramsey: 15%")}
        <label className="row switch-row">
          <div className="grow"><strong>I have children</strong><div className="muted small">Step 5: college fund</div></div>
          <input type="checkbox" role="switch" checked={kids} onChange={(e) => setKids(e.target.checked)} />
        </label>
        {kids && (
          <>
            {field("college_saved", "College fund saved")}
            {field("college_target", "College fund target")}
          </>
        )}
        <span className="small muted">Home (step 6)</span>
        <Choice options={[["renting", "Renting"], ["mortgage", "Mortgage"], ["owned", "Paid off"]]} value={home} onChange={setHome} />
        {home === "mortgage" && (
          <>
            {field("mortgage_balance", "Mortgage left")}
            {field("mortgage_original", "Mortgage started at")}
          </>
        )}
        <label className="row switch-row">
          <div className="grow"><strong>I give regularly</strong><div className="muted small">Step 7</div></div>
          <input type="checkbox" role="switch" checked={giving} onChange={(e) => setGiving(e.target.checked)} />
        </label>
      </Card>
      <div className="row">
        <button type="submit">Save</button>
        {message && <span className={message.ok ? "form-success" : "form-error"}>{message.text}</span>}
      </div>
    </form>
  );
}
