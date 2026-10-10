import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../utils/useFetch";
import { formatDate, formatINR } from "../../utils/format";
import { Alert, Button, Card, EmptyState, PageHeader, PageLoader, StatusBadge } from "../../components/ui";

export default function MyProposals() {
  const { data: proposals, loading, error, reload } = useFetch("/proposals/mine");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState("");

  const withdraw = async (p) => {
    if (!window.confirm("Withdraw this proposal?")) return;
    setBusy(p._id);
    setActionError("");
    try {
      await api.patch(`/proposals/${p._id}/withdraw`);
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
      <PageHeader title="My proposals" />
      <Alert>{error || actionError}</Alert>
      {proposals?.length === 0 ? (
        <EmptyState title="No proposals sent" description="Browse open requirements and send your first offer." action={<Link to="/provider/requests"><Button>Find requirements</Button></Link>} />
      ) : (
        <div className="space-y-4">
          {proposals?.map((p) => (
            <Card key={p._id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{p.request?.title}</h3>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {p.request?.location} · {formatDate(p.request?.eventDate)} · Sent {formatDate(p.createdAt)}
                  </p>
                  {p.includedServices.length > 0 && <p className="mt-2 text-sm text-slate-600">Includes: {p.includedServices.join(", ")}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">{formatINR(p.proposedPrice)}</p>
                  {p.status === "PENDING" && (
                    <Button size="sm" variant="ghost" className="mt-2" loading={busy === p._id} onClick={() => withdraw(p)}>Withdraw</Button>
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
