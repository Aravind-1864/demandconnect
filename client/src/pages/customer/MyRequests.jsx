import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../utils/useFetch";
import { budgetLabel, formatDate } from "../../utils/format";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, PageLoader, StatusBadge } from "../../components/ui";

export default function MyRequests() {
  const { data: requests, loading, error, reload } = useFetch("/requests/mine");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState("");

  const cancel = async (r) => {
    if (!window.confirm(`Cancel "${r.title}"? Pending proposals will be rejected.`)) return;
    setBusy(r._id);
    setActionError("");
    try {
      await api.delete(`/requests/${r._id}`);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <PageHeader title="My requirements" actions={<Link to="/choose-mode"><Button>+ New</Button></Link>} />
      <Alert>{error || actionError}</Alert>

      {requests?.length === 0 ? (
        <EmptyState title="No requirements yet" description="Post an event requirement to start receiving proposals." action={<Link to="/choose-mode"><Button>Post a requirement</Button></Link>} />
      ) : (
        <div className="space-y-4">
          {requests?.map((r) => (
            <Card key={r._id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{r.title}</h3>
                    <StatusBadge status={r.status} />
                    {r.mode === "AI" && <Badge tone="brand">✨ AI</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {r.eventType} · {r.location} · {formatDate(r.eventDate)} · Budget {budgetLabel(r.budgetMin, r.budgetMax)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.services.map((s) => <Badge key={s.category._id}>{s.category.name}</Badge>)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/customer/requests/${r._id}/proposals`}>
                    <Button size="sm" variant={r.pendingProposals ? "primary" : "secondary"}>
                      Proposals{r.pendingProposals ? ` (${r.pendingProposals})` : ""}
                    </Button>
                  </Link>
                  {["OPEN", "BOOKED"].includes(r.status) && (
                    <Link to={`/customer/requests/${r._id}/plan`}><Button size="sm" variant="secondary">Plan</Button></Link>
                  )}
                  {r.status === "OPEN" && (
                    <>
                      <Link to={`/ai/recommendations/${r._id}`}><Button size="sm" variant="secondary">Recommendations</Button></Link>
                      <Button size="sm" variant="ghost" loading={busy === r._id} onClick={() => cancel(r)}>Cancel</Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
