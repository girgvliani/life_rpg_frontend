import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGoal, getAttempts, getQuestionnaire, submitQuestionnaire } from "../api/endpoints";
import type { Answers, Attempt, PlanStep, QQuestion, QSection, Questionnaire } from "../api/types";
import { Card, Loaded, Meter, PageHeader } from "../components/ui";
import { categoryIcon } from "../lib/categories";
import { errorText, useLoad } from "../lib/load";
import { RANKS, rankColor } from "../lib/ranks";

const rankLetter = (score: number) => RANKS.find((r) => score >= r.min)?.letter ?? "F";

/**
 * What matters to you and what to change to get there faster. Opens on the latest results once
 * taken; "Retake" starts from the last answers. Every attempt is kept.
 */
export function QuestionnairePage() {
  const data = useLoad(async () => {
    const [questionnaire, attempts] = await Promise.all([getQuestionnaire(), getAttempts()]);
    return { questionnaire, attempts };
  });
  const [taking, setTaking] = useState(false);

  return (
    <Loaded load={data}>
      {({ questionnaire, attempts }) =>
        taking || !questionnaire.latest ? (
          <Form
            questionnaire={questionnaire}
            onDone={() => { setTaking(false); data.reload(); }}
            onCancel={questionnaire.latest ? () => setTaking(false) : undefined}
          />
        ) : (
          <Results latest={questionnaire.latest} attempts={attempts} onRetake={() => setTaking(true)} />
        )
      }
    </Loaded>
  );
}

/** The first unanswered required question in a section, as a message; null when all are done */
function missing(section: QSection, answers: Answers): string | null {
  for (const q of section.questions) {
    const a = answers[q.id];
    const empty = a === undefined || a === null || a === "" || (Array.isArray(a) && a.length === 0);
    if (empty && !q.optional) return `Answer "${q.text}"`;
    if (q.kind === "number" && !empty) {
      const n = Number(a);
      if (Number.isNaN(n)) return `"${q.text}": enter a number`;
      if ((q.min !== undefined && n < q.min) || (q.max !== undefined && n > q.max)) return `"${q.text}": ${q.min} to ${q.max}`;
    }
  }
  return null;
}

function Form({ questionnaire, onDone, onCancel }: { questionnaire: Questionnaire; onDone: () => void; onCancel?: () => void }) {
  const [answers, setAnswers] = useState<Answers>(() => {
    const start = { ...questionnaire.prefill };
    for (const s of questionnaire.sections) {
      for (const q of s.questions) if (q.kind === "rank" && !start[q.id]) start[q.id] = q.options!.map((o) => o.value);
    }
    return start;
  });
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const sections = questionnaire.sections;
  const section = sections[step];
  const last = step === sections.length - 1;
  const set = (id: string, value: unknown) => setAnswers((a) => ({ ...a, [id]: value }));

  async function next() {
    const problem = missing(section, answers);
    setError(problem);
    if (problem) return;
    if (!last) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    setSending(true);
    try {
      const clean = Object.fromEntries(Object.entries(answers).map(([k, v]) => {
        const q = sections.flatMap((s) => s.questions).find((x) => x.id === k);
        return [k, q?.kind === "number" && v !== "" && v !== undefined ? Number(v) : v];
      }).filter(([, v]) => v !== "" && v !== undefined));
      await submitQuestionnaire(clean);
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <PageHeader
        title="QUESTIONNAIRE"
        subtitle={`Step ${step + 1} of ${sections.length}`}
        action={onCancel && <button className="ghost" onClick={onCancel}>Cancel</button>}
      />
      <Meter value={(step + 1) / sections.length} />
      <div>
        <h2>{section.title.toUpperCase()}</h2>
        {section.intro && <p className="muted small" style={{ margin: "0.3rem 0 0" }}>{section.intro}</p>}
      </div>
      {section.questions.map((q) => (
        <Card key={q.id} title={q.text + (q.optional ? "  (optional)" : "")}>
          <QuestionInput q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />
        </Card>
      ))}
      {error && <p className="form-error">❌ {error}</p>}
      <div className="row">
        {step > 0 && <button className="ghost" onClick={() => { setStep(step - 1); setError(null); }}>Back</button>}
        <button onClick={next} disabled={sending} className="grow">
          {sending ? "Working out your plan…" : last ? "See my plan" : "Next"}
        </button>
      </div>
    </div>
  );
}

function QuestionInput({ q, value, onChange }: { q: QQuestion; value: unknown; onChange: (v: unknown) => void }) {
  if (q.kind === "single") {
    return (
      <div className="stack" style={{ gap: "0.4rem" }}>
        {q.options!.map((o) => (
          <button key={o.value} className={`option ${value === o.value ? "on" : ""}`} onClick={() => onChange(o.value)}>
            <span aria-hidden>{value === o.value ? "◉" : "○"}</span> {o.label}
          </button>
        ))}
      </div>
    );
  }
  if (q.kind === "multi") {
    const picked = (value as string[] | undefined) ?? [];
    return (
      <div className="stack" style={{ gap: "0.4rem" }}>
        {q.options!.map((o) => {
          const on = picked.includes(o.value);
          const full = q.max !== undefined && picked.length >= q.max && !on;
          return (
            <button key={o.value} className={`option ${on ? "on" : ""}`} disabled={full} onClick={() =>
              onChange(on ? picked.filter((p) => p !== o.value) : o.value === "none" ? ["none"] : [...picked.filter((p) => p !== "none"), o.value])}>
              <span aria-hidden>{on ? "☑" : "☐"}</span> {o.label}
            </button>
          );
        })}
      </div>
    );
  }
  if (q.kind === "scale") {
    return (
      <div className="stack" style={{ gap: "0.3rem" }}>
        <div className="row" style={{ gap: "0.4rem" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className={`option scale ${value === n ? "on" : ""}`} onClick={() => onChange(n)}>{n}</button>
          ))}
        </div>
        <div className="row spread muted small"><span>{q.min_label}</span><span>{q.max_label}</span></div>
      </div>
    );
  }
  if (q.kind === "rank") {
    const order = value as string[];
    const label = (v: string) => q.options!.find((o) => o.value === v)?.label ?? v;
    const move = (i: number, by: number) => {
      const next = [...order];
      next.splice(i + by, 0, next.splice(i, 1)[0]);
      onChange(next);
    };
    return (
      <div className="stack" style={{ gap: "0.3rem" }}>
        {order.map((v, i) => (
          <div key={v} className="row">
            <strong style={{ width: 22, color: "var(--accent)" }}>{i + 1}</strong>
            <strong className="grow">{categoryIcon(v)} {label(v)}</strong>
            <button className="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${label(v)} up`}>↑</button>
            <button className="ghost" disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${label(v)} down`}>↓</button>
          </div>
        ))}
      </div>
    );
  }
  if (q.kind === "number") {
    return (
      <input inputMode="decimal" value={value === undefined || value === null ? "" : String(value)} placeholder={q.unit || "Number"}
        onChange={(e) => onChange(e.target.value.replace(",", "."))} />
    );
  }
  return (
    <input value={(value as string | undefined) ?? ""} maxLength={q.max} placeholder="Your answer" onChange={(e) => onChange(e.target.value)} />
  );
}

function Results({ latest, attempts, onRetake }: { latest: Attempt; attempts: Attempt[]; onRetake: () => void }) {
  const r = latest.results;
  const nameOf = (a: Attempt, key: string) => a.results.priorities.find((p) => p.key === key)?.name ?? key;
  return (
    <div className="stack">
      <PageHeader
        title="YOUR PLAN"
        subtitle={`From your answers on ${latest.created_at.slice(0, 10)}. Retake it whenever your life changes; every attempt is kept.`}
        action={<button className="ghost" onClick={onRetake}>Retake</button>}
      />
      <div className="grid split-left" style={{ alignItems: "start" }}>
        <div className="stack">
          <div className="section-title">Change these, in this order</div>
          {r.plan.map((step, i) => <PlanCard key={step.id} number={i + 1} step={step} />)}
        </div>
        <div className="stack">
          <Card title="What matters to you">
            {r.priorities.map((p, i) => (
              <div key={p.key} className="row">
                <strong style={{ width: 22, color: "var(--accent)" }}>{i + 1}</strong>
                <span className="grow" style={{ fontWeight: r.focus.includes(p.key) ? 800 : 400 }}>{categoryIcon(p.key)} {p.name}</span>
                <strong className="num">{p.tracked ? p.level : `~${p.level}`}</strong>
                <span className="rank" style={{ width: 34, color: rankColor(rankLetter(p.level)) }}>{rankLetter(p.level)}</span>
              </div>
            ))}
            <span className="muted small">~ = estimated from your answers until there's tracked data</span>
          </Card>
          <Card title="Focus on">
            <strong>{r.focus.map((k) => `${categoryIcon(k)} ${nameOf(latest, k)}`).join("  ·  ")}</strong>
            <span className="muted small">Where what matters most to you is furthest behind.</span>
          </Card>
          {r.tips.length > 0 && (
            <Card title="What works for you">
              {r.tips.map((t) => <span key={t} className="small">• {t}</span>)}
            </Card>
          )}
          {attempts.length > 1 && (
            <Card title="Past attempts">
              {attempts.map((a) => (
                <div key={a.id} className="row small">
                  <span className="muted" style={{ width: 90 }}>{a.created_at.slice(0, 10)}</span>
                  <span>Focus: {a.results.focus.map((k) => nameOf(a, k)).join(", ")}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanCard({ number, step }: { number: number; step: PlanStep }) {
  const [added, setAdded] = useState<string | null>(null);
  const navigate = useNavigate();
  async function makeGoal() {
    try {
      await createGoal({ ...step.goal, intensity: 5 });
      setAdded("✓ Goal added");
    } catch (err) {
      setAdded(`❌ ${errorText(err)}`);
    }
  }
  return (
    <Card>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <strong style={{ width: 24, color: "var(--accent)", fontSize: "1.2rem" }}>{number}</strong>
        <div className="grow">
          <strong style={{ fontSize: "1.05rem" }}>{step.title}</strong>
          <div className="muted small">{categoryIcon(step.category)} {step.category_name}</div>
        </div>
      </div>
      <span className="muted small">{step.why}</span>
      <span className="small">First step: {step.first_step}</span>
      {step.goal && (
        <div className="row">
          {added === null ? (
            <button className="ghost" onClick={makeGoal}>🎯 Make it a goal</button>
          ) : (
            <>
              <span className={added.startsWith("✓") ? "form-success" : "form-error"}>{added}</span>
              {added.startsWith("✓") && <button className="ghost" onClick={() => navigate("/goals")}>Open goals</button>}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
