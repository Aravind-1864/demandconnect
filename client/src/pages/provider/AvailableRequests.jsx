import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../utils/useFetch";
import { budgetLabel, formatDate } from "../../utils/format";
import { useRealtime } from "../../context/RealtimeContext";
import { Alert, Badge, Button, Card, ChipInput, EmptyState, Field, Input, PageHeader, PageLoader, StatusBadge, Textarea } from "../../components/ui";

function ProposalForm({ request, templates = [], onDone }) {
  const [form, setForm] = useState({ proposedPrice: "", includedServices: [], exclusions: [], message: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!Number(form.proposedPrice) || Number(form.proposedPrice) <= 0) return setError("Enter your price");
    setSaving(true);
    setError("");
    try {
      await api.post("/proposals", { request: request._id, ...form, proposedPrice: Number(form.proposedPrice) });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <Alert>{error}</Alert>
      {templates.length > 0 && (
        <Field label="Start from a template">
          <select
            className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              const t = templates[Number(e.target.value)];
              if (t) setForm((f) => ({ ...f, includedServices: t.includedServices, exclusions: t.exclusions, message: t.message }));
            }}
          >
            <option value="">Choose…</option>
            {templates.map((t, i) => (
              <option key={t.name + i} value={i}>{t.name}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Your price (₹)" required hint={request.budgetMax ? `Customer budget: ${budgetLabel(request.budgetMin, request.budgetMax)}` : undefined}>
        <Input type="number" min="1" value={form.proposedPrice} onChange={(e) => setForm({ ...form, proposedPrice: e.target.value })} />
      </Field>
      <Field label="What's included" hint="Press Enter after each item">
        <ChipInput value={form.includedServices} onChange={(includedServices) => setForm({ ...form, includedServices })} placeholder="e.g. 8 hours coverage" />
      </Field>
      <Field label="What's not included">
        <ChipInput value={form.exclusions} onChange={(exclusions) => setForm({ ...form, exclusions })} placeholder="e.g. Travel outside city" />
      </Field>
      <Field label="Message to the customer">
        <Textarea rows={3} maxLength={1500} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </Field>
      <Button type="submit" loading={saving}>Send proposal</Button>
    </form>
  );
}

export default function AvailableRequests() {
  const [onlyMatching, setOnlyMatching] = useState(true);
  const { data: requests, loading, error, reload } = useFetch("/requests/open", { matching: String(onlyMatching) });
  const [openId, setOpenId] = useState(null);
  const { data: mine } = useFetch("/providers/me");
  const { socket } = useRealtime();

  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      reload();
    };
    socket.on("new_request", handler);
    return () => socket.off("new_request", handler);
  }, [socket, reload]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Live Requirements</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Live Feed
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Customer requests matching your services in real-time.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white/80 border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
          <input type="checkbox" checked={onlyMatching} onChange={(e) => setOnlyMatching(e.target.checked)} className="h-4 w-4 rounded accent-brand-600 cursor-pointer" />
          Filter by my services
        </label>
      </div>

      {loading && <PageLoader />}
      {error && (
        <Alert>
          {error}{" "}
          {error.includes("profile") && <Link to="/provider/profile" className="font-semibold underline">Create your profile</Link>}
        </Alert>
      )}

      {!loading && !error && requests?.length === 0 && (
        <EmptyState title="No open requirements" description={onlyMatching ? "Nothing matches your categories right now. Try showing all requirements." : "Check back soon."} />
      )}

      <div className="space-y-4">
        {requests?.map((r) => (
          <Card key={r._id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{r.title}</h3>
                  {r.invited && <Badge tone="violet">Invited to quote</Badge>}
                  {r.myProposalStatus && <StatusBadge status={r.myProposalStatus} />}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {r.eventType} · {r.location} · {formatDate(r.eventDate)}
                  {r.guestCount ? ` · ${r.guestCount} guests` : ""} · Budget {budgetLabel(r.budgetMin, r.budgetMax)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.services.map((s) => (
                    <span key={s.category._id} className="text-xs text-slate-600">
                      <Badge tone="brand">{s.category.name}</Badge>{" "}
                      {s.requirements.length > 0 && <span className="text-slate-400">{s.requirements.join(", ")}</span>}
                    </span>
                  ))}
                </div>
                {r.description && <p className="mt-3 text-sm text-slate-600">{r.description}</p>}
              </div>
              {(!r.myProposalStatus || r.myProposalStatus === "WITHDRAWN") && (
                <Button size="sm" variant={openId === r._id ? "secondary" : "primary"} onClick={() => setOpenId(openId === r._id ? null : r._id)}>
                  {openId === r._id ? "Close" : "Send proposal"}
                </Button>
              )}
            </div>
            {openId === r._id && <ProposalForm request={r} templates={mine?.proposalTemplates || []} onDone={() => { setOpenId(null); reload(); }} />}
          </Card>
        ))}
      </div>
    </>
  );
}
