import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errorMessage, unwrap } from "../../services/api";
import useFetch from "../../utils/useFetch";
import { budgetLabel, formatDate, formatINR } from "../../utils/format";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, PageLoader, StatusBadge, Stars } from "../../components/ui";

export default function Proposals() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: request, loading: l1, error: e1 } = useFetch(`/requests/${id}`);
  const { data: proposals, loading: l2, error: e2, reload } = useFetch(`/requests/${id}/proposals`);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);

  if (l1 || l2) return <PageLoader />;
  if (e1 || e2) return <Alert>{e1 || e2}</Alert>;

  const pending = proposals.filter((p) => p.status === "PENDING");
  const isOpen = request.status === "OPEN";
  const cheapest = pending.length ? Math.min(...pending.map((p) => p.proposedPrice)) : null;

  const accept = async (p) => {
    const name = p.providerProfile?.businessName || "this provider";
    if (!window.confirm(`Accept ${name}'s proposal for ${formatINR(p.proposedPrice)}? This creates a booking and rejects the other proposals.`)) return;
    setBusy(p._id);
    setError("");
    try {
      await api.patch(`/proposals/${p._id}/accept`);
      navigate("/customer/bookings", { state: { celebrate: true } });
    } catch (err) {
      setError(errorMessage(err));
      reload();
    } finally {
      setBusy("");
    }
  };

  const reject = async (p) => {
    setBusy(p._id);
    setError("");
    try {
      await api.patch(`/proposals/${p._id}/reject`);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const compare = async () => {
    setComparing(true);
    setError("");
    try {
      setComparison(unwrap(await api.post("/ai/compare-proposals", { requestId: id })));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setComparing(false);
    }
  };

  const tagsFor = (p) => {
    const f = comparison?.facts;
    if (!f) return [];
    return [
      f.cheapest === p._id && ["Lowest price", "green"],
      f.highestRated === p._id && ["Highest rated", "amber"],
      f.mostInclusive === p._id && ["Most inclusive", "violet"],
      f.overBudget?.includes(p._id) && ["Over budget", "red"],
    ].filter(Boolean);
  };

  return (
    <>
      <Link to="/customer/requests" className="text-sm text-slate-500 hover:text-slate-800">← My requirements</Link>
      <div className="mt-3">
        <PageHeader title={request.title} subtitle={`${request.eventType} · ${request.location} · ${formatDate(request.eventDate)} · Budget ${budgetLabel(request.budgetMin, request.budgetMax)}`} actions={<StatusBadge status={request.status} />} />
      </div>

      <Alert>{error}</Alert>

      {pending.length > 1 && isOpen && (
        <Card className="mb-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Compare proposals</h2>
              <p className="text-sm text-slate-500">Highlights the lowest price, best rating and most inclusive offer.</p>
            </div>
            <Button variant="secondary" loading={comparing} onClick={compare}>✨ Compare</Button>
          </div>
          {comparison?.summary && <p className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-slate-700">{comparison.summary}</p>}
        </Card>
      )}

      {proposals.length === 0 ? (
        <EmptyState
          title="No proposals yet"
          description="Providers are notified of open requirements. Invite specific providers to get quotes faster."
          action={
            <div className="flex justify-center gap-2">
              <Link to="/providers"><Button variant="secondary">Browse providers</Button></Link>
              <Link to={`/ai/recommendations/${id}`}><Button>See recommendations</Button></Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => {
            const profile = p.providerProfile;
            return (
              <Card key={p._id} className={`p-5 ${p.status === "ACCEPTED" ? "border-emerald-300 ring-1 ring-emerald-200" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/providers/${profile?._id}`} className="text-lg font-semibold text-slate-900 hover:text-brand-600">
                        {profile?.businessName}
                      </Link>
                      {profile?.verified && <Badge tone="green">✓ Verified</Badge>}
                      <StatusBadge status={p.status} />
                      {tagsFor(p).map(([label, tone]) => <Badge key={label} tone={tone}>{label}</Badge>)}
                    </div>
                    <div className="mt-1"><Stars value={profile?.ratingAverage} count={profile?.ratingCount} /></div>

                    {p.message && <p className="mt-3 text-sm text-slate-600">“{p.message}”</p>}
                    {p.provider && (
                      <Link to={`/messages/${p.provider}`} className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
                        💬 Message {profile?.businessName}
                      </Link>
                    )}

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Included</p>
                        {p.includedServices.length ? (
                          <ul className="mt-1 space-y-0.5 text-sm text-slate-700">{p.includedServices.map((s) => <li key={s}>✓ {s}</li>)}</ul>
                        ) : <p className="mt-1 text-sm text-slate-400">Not specified</p>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Not included</p>
                        {p.exclusions.length ? (
                          <ul className="mt-1 space-y-0.5 text-sm text-slate-700">{p.exclusions.map((s) => <li key={s}>✕ {s}</li>)}</ul>
                        ) : <p className="mt-1 text-sm text-slate-400">Nothing listed</p>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{formatINR(p.proposedPrice)}</p>
                    {p.status === "PENDING" && p.proposedPrice === cheapest && pending.length > 1 && (
                      <p className="text-xs font-medium text-emerald-600">Lowest offer</p>
                    )}
                    {p.status === "PENDING" && isOpen && (
                      <div className="mt-3 flex flex-col gap-2">
                        <Button variant="success" size="sm" loading={busy === p._id} onClick={() => accept(p)}>Accept proposal</Button>
                        <Button variant="ghost" size="sm" disabled={busy === p._id} onClick={() => reject(p)}>Reject</Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
