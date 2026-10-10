import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../utils/useFetch";
import { formatDate, formatINR } from "../../utils/format";
import { Alert, Button, Card, EmptyState, Field, Modal, PageHeader, PageLoader, StatusBadge, Textarea } from "../../components/ui";

/** Shared by customers and providers; the available actions depend on the role. */
export default function Bookings() {
  const { user } = useAuth();
  const isProvider = user.role === "PROVIDER";
  const { data: bookings, loading, error, reload } = useFetch("/bookings/mine");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState("");
  const [reviewing, setReviewing] = useState(null);

  const setStatus = async (b, status, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(b._id + status);
    setActionError("");
    try {
      await api.patch(`/bookings/${b._id}/status`, { status });
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
      <PageHeader title="Bookings" subtitle={isProvider ? "Jobs you have been awarded." : "Providers you have booked."} />
      <Alert>{error || actionError}</Alert>

      {bookings?.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description={isProvider ? "Send proposals on open requirements — accepted proposals appear here." : "Accept a proposal and your booking will appear here."}
          action={isProvider ? <Link to="/provider/requests"><Button>Find requirements</Button></Link> : <Link to="/customer/requests"><Button>View my requirements</Button></Link>}
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <Card key={b._id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{b.request?.title}</h3>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {isProvider ? `Customer: ${b.customer?.name}` : `Provider: ${b.providerProfile?.businessName}`} · {b.request?.location} · {formatDate(b.eventDate)}
                  </p>
                  {b.status === "COMPLETED" && b.completedAt && <p className="mt-1 text-xs text-slate-400">Completed {formatDate(b.completedAt)}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">{formatINR(b.agreedPrice)}</p>
                  <p className="text-xs text-slate-400">Agreed price</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {isProvider && b.status === "CONFIRMED" && (
                  <Button size="sm" loading={busy === b._id + "IN_PROGRESS"} onClick={() => setStatus(b, "IN_PROGRESS")}>Start work</Button>
                )}
                {isProvider && b.status === "IN_PROGRESS" && (
                  <Button size="sm" variant="success" loading={busy === b._id + "COMPLETED"} onClick={() => setStatus(b, "COMPLETED", "Mark this job as completed?")}>Mark completed</Button>
                )}
                {["CONFIRMED", "IN_PROGRESS"].includes(b.status) && (
                  <Button size="sm" variant="ghost" loading={busy === b._id + "CANCELLED"} onClick={() => setStatus(b, "CANCELLED", "Cancel this booking? The requirement will be re-opened for new proposals.")}>
                    Cancel booking
                  </Button>
                )}
                {!isProvider && b.status === "COMPLETED" && !b.reviewed && (
                  <Button size="sm" onClick={() => setReviewing(b)}>★ Leave a review</Button>
                )}
                {b.reviewed && <span className="text-sm text-emerald-600">✓ Review submitted</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ReviewModal booking={reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); reload(); }} />
    </>
  );
}

function ReviewModal({ booking, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/reviews", { booking: booking._id, rating, comment });
      setComment("");
      setRating(5);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!booking} onClose={onClose} title={`Review ${booking?.providerProfile?.businessName || ""}`}>
      <form onSubmit={submit} className="space-y-4">
        <Alert>{error}</Alert>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Your rating</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className={`text-3xl transition ${n <= rating ? "text-amber-500" : "text-slate-300 hover:text-amber-300"}`}>
                ★
              </button>
            ))}
          </div>
        </div>
        <Field label="Comment (optional)">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="How was your experience?" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Submit review</Button>
        </div>
      </form>
    </Modal>
  );
}
