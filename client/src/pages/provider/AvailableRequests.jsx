import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../utils/useFetch";
import { budgetLabel, formatDate } from "../../utils/format";
import { Alert, Badge, Button, Card, ChipInput, EmptyState, Field, Input, PageHeader, PageLoader, StatusBadge, Textarea } from "../../components/ui";

function ProposalForm({ request, onDone }) {
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
    <form onSubmit={submit} className="mt-4 space-y-4 rounded-lg border border-brand-200 bg-brand-50/40 p-4">
      <Alert>{error}</Alert>
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

  return (
    <>
      <PageHeader
        title="Open requirements"
        subtitle="Customers looking for providers right now."
        actions={
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={onlyMatching} onChange={(e) => setOnlyMatching(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
            Only my categories
          </label>
        }
      />

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
            {openId === r._id && <ProposalForm request={r} onDone={() => { setOpenId(null); reload(); }} />}
          </Card>
        ))}
      </div>
    </>
  );
}
