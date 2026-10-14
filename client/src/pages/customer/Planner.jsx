import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../utils/useFetch";
import { formatDate, formatINR } from "../../utils/format";
import { CountUp } from "../../components/motion";
import { Meter } from "../../components/visual";
import { Alert, Button, Card, Input, PageHeader, PageLoader, StatusBadge } from "../../components/ui";

const SUGGESTED = [
  "Confirm the venue and date",
  "Finalise the guest list",
  "Book photographer and caterer",
  "Send invitations",
  "Confirm decoration and flowers",
  "Plan the day-of timeline",
];

export default function Planner() {
  const { id } = useParams();
  const { data: request, loading, error } = useFetch(`/requests/${id}`);
  const { data: proposals } = useFetch(`/requests/${id}/proposals`);
  const [checklist, setChecklist] = useState([]);
  const [plan, setPlan] = useState([]);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState({ saving: false, saved: false, error: "" });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!request) return;
    setChecklist(request.checklist || []);
    // One budget line per requested service unless the customer already saved a plan.
    setPlan(
      request.budgetPlan?.length
        ? request.budgetPlan
        : request.services.map((s) => ({ label: s.category.name, amount: 0 }))
    );
  }, [request]);

  const daysLeft = useMemo(() => {
    if (!request) return null;
    const ms = new Date(request.eventDate).getTime() - Date.now();
    return Math.ceil(ms / 864e5);
  }, [request]);

  if (loading) return <PageLoader />;
  if (error) return <Alert>{error}</Alert>;

  const done = checklist.filter((c) => c.done).length;
  const planned = plan.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const accepted = proposals?.find((p) => p.status === "ACCEPTED");
  const quoted = accepted?.proposedPrice;
  const budget = request.budgetMax;

  const edit = (fn) => {
    fn();
    setDirty(true);
    setState((s) => ({ ...s, saved: false }));
  };

  const save = async () => {
    setState({ saving: true, saved: false, error: "" });
    try {
      await api.patch(`/requests/${id}/plan`, {
        checklist: checklist.filter((c) => c.text.trim()),
        budgetPlan: plan.filter((p) => p.label.trim()).map((p) => ({ label: p.label, amount: Number(p.amount) || 0 })),
      });
      setDirty(false);
      setState({ saving: false, saved: true, error: "" });
    } catch (err) {
      setState({ saving: false, saved: false, error: errorMessage(err) });
    }
  };

  return (
    <>
      <Link to="/customer/requests" className="text-sm text-slate-500 hover:text-slate-800">← My requirements</Link>
      <div className="mt-3">
        <PageHeader
          title={request.title}
          subtitle={`${request.eventType} · ${request.location} · ${formatDate(request.eventDate)}`}
          actions={
            <>
              <StatusBadge status={request.status} />
              <Button loading={state.saving} disabled={!dirty} onClick={save}>{state.saved ? "✓ Saved" : "Save plan"}</Button>
            </>
          }
        />
      </div>
      <Alert>{state.error}</Alert>

      <div className="grid gap-5 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-sm text-white/80">{daysLeft >= 0 ? "Days to go" : "Event date passed"}</p>
          <p className="font-display text-6xl font-semibold"><CountUp value={Math.max(0, daysLeft)} format={(n) => Math.round(n)} /></p>
          <p className="mt-1 text-sm text-white/80">{formatDate(request.eventDate, { weekday: "long", day: "numeric", month: "long" })}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-slate-500">Checklist</p>
          <p className="font-display text-4xl font-semibold text-slate-900">{done}<span className="text-xl text-slate-400"> / {checklist.length}</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${checklist.length ? (done / checklist.length) * 100 : 0}%` }} />
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-slate-500">Proposals</p>
          <p className="font-display text-4xl font-semibold text-slate-900">{proposals?.filter((p) => p.status === "PENDING").length || 0}</p>
          <Link to={`/customer/requests/${id}/proposals`} className="mt-2 inline-block text-sm font-semibold text-brand-600">Review proposals →</Link>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">To-do list</h2>
            {checklist.length === 0 && (
              <button className="text-sm font-semibold text-brand-600" onClick={() => edit(() => setChecklist(SUGGESTED.map((text) => ({ text, done: false }))))}>
                Add suggested tasks
              </button>
            )}
          </div>
          <ul className="mt-4 space-y-1">
            {checklist.map((c, i) => (
              <li key={i} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={() => edit(() => setChecklist((l) => l.map((x, j) => (j === i ? { ...x, done: !x.done } : x))))}
                  className="h-5 w-5 rounded accent-[var(--color-brand-600)]"
                  aria-label={c.text}
                />
                <span className={`flex-1 text-sm transition ${c.done ? "text-slate-400 line-through" : "text-slate-800"}`}>{c.text}</span>
                <button
                  aria-label="Remove task"
                  className="text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                  onClick={() => edit(() => setChecklist((l) => l.filter((_, j) => j !== i)))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              edit(() => setChecklist((l) => [...l, { text: draft.trim(), done: false }]));
              setDraft("");
            }}
          >
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a task…" maxLength={140} />
            <Button type="submit" variant="secondary">Add</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-900">Budget planner</h2>
          <p className="mt-1 text-sm text-slate-500">
            {budget ? `Total budget ${formatINR(budget)}` : "No overall budget set."} Split it across what you need.
          </p>

          <div className="mt-5 space-y-3">
            {plan.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_9rem_auto] items-center gap-2">
                <Input value={p.label} onChange={(e) => edit(() => setPlan((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))))} maxLength={60} />
                <Input
                  type="number"
                  min="0"
                  value={p.amount}
                  onChange={(e) => edit(() => setPlan((l) => l.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x))))}
                  aria-label={`${p.label} amount`}
                />
                <button aria-label="Remove line" className="px-1 text-slate-300 hover:text-red-500" onClick={() => edit(() => setPlan((l) => l.filter((_, j) => j !== i)))}>✕</button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => edit(() => setPlan((l) => [...l, { label: "", amount: 0 }]))}>+ Add line</Button>
          </div>

          <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
            <Meter label="Planned" value={planned} max={budget || planned || 1} />
            {quoted && <Meter label="Accepted proposal" value={quoted} max={budget || quoted} />}
            {budget > 0 && (
              <p className={`text-sm font-semibold ${planned > budget ? "text-red-600" : "text-emerald-600"}`}>
                {planned > budget ? `${formatINR(planned - budget)} over budget` : `${formatINR(budget - planned)} unallocated`}
              </p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
