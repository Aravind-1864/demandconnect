import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../utils/useFetch";
import { formatDate, formatINR } from "../../utils/format";
import { fireConfetti } from "../../components/motion";
import { ImageUploader } from "../../components/visual";
import { Alert, Button, Card, EmptyState, Field, Modal, PageHeader, PageLoader, StatusBadge, Textarea } from "../../components/ui";

/** Shared by customers and providers; the available actions depend on the role. */
export default function Bookings() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isProvider = user.role === "PROVIDER";
  const { data: bookings, loading, error, reload } = useFetch("/bookings/mine");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState("");
  const [reviewing, setReviewing] = useState(null);
  const [replying, setReplying] = useState({});

  // Arrived straight from accepting a proposal.
  useEffect(() => {
    if (location.state?.celebrate) {
      fireConfetti();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const setStatus = async (b, status, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(b._id + status);
    setActionError("");
    try {
      await api.patch(`/bookings/${b._id}/status`, { status });
      if (status === "COMPLETED") fireConfetti(1600);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const sendReply = async (review) => {
    const text = (replying[review._id] || "").trim();
    if (!text) return;
    setBusy("reply" + review._id);
    setActionError("");
    try {
      await api.patch(`/reviews/${review._id}/reply`, { text });
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
          {bookings.map((b) => {
            const counterpartId = isProvider ? b.customer?._id : null;
            return (
              <Card key={b._id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-slate-900">{b.request?.title}</h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {isProvider ? `Customer: ${b.customer?.name}` : `Provider: ${b.providerProfile?.businessName}`} · {b.request?.location} · {formatDate(b.eventDate)}
                    </p>
                    {b.status === "COMPLETED" && b.completedAt && <p className="mt-1 text-xs text-slate-400">Completed {formatDate(b.completedAt)}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-semibold text-slate-900">{formatINR(b.agreedPrice)}</p>
                    <p className="text-xs text-slate-400">Agreed price</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
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
                  <Link
                    to={`/messages/${isProvider ? counterpartId : b.providerProfile?.user || ""}`}
                    className={isProvider || b.providerProfile?.user ? "" : "hidden"}
                  >
                    <Button size="sm" variant="secondary">💬 Message</Button>
                  </Link>
                  {!isProvider && b.request?._id && (
                    <Link to={`/customer/requests/${b.request._id}/plan`}><Button size="sm" variant="secondary">Event plan</Button></Link>
                  )}
                </div>

                {b.review && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{isProvider ? "Customer review" : "Your review"}</span>
                      <span className="text-amber-500">{"★".repeat(b.review.rating)}<span className="text-slate-300">{"★".repeat(5 - b.review.rating)}</span></span>
                    </div>
                    {b.review.comment && <p className="mt-1 text-sm text-slate-600">{b.review.comment}</p>}
                    {b.review.photos?.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {b.review.photos.map((u) => <img key={u} src={u} alt="Review" className="h-14 w-14 rounded-lg object-cover" />)}
                      </div>
                    )}

                    {b.review.reply?.text ? (
                      <div className="mt-3 border-l-2 border-brand-200 pl-3 text-sm">
                        <p className="text-xs font-semibold text-slate-500">{isProvider ? "Your reply" : "Provider's reply"}</p>
                        <p className="text-slate-700">{b.review.reply.text}</p>
                      </div>
                    ) : (
                      isProvider && (
                        <div className="mt-3 flex gap-2">
                          <input
                            value={replying[b.review._id] || ""}
                            onChange={(e) => setReplying((r) => ({ ...r, [b.review._id]: e.target.value }))}
                            maxLength={1000}
                            placeholder="Reply publicly to this review…"
                            className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
                          />
                          <Button size="sm" loading={busy === "reply" + b.review._id} onClick={() => sendReply(b.review)}>Reply</Button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ReviewModal
        booking={reviewing}
        onClose={() => setReviewing(null)}
        onDone={() => {
          setReviewing(null);
          reload();
        }}
      />
    </>
  );
}

function ReviewModal({ booking, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/reviews", { booking: booking._id, rating, comment, photos });
      setComment("");
      setPhotos([]);
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
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRating(n)}
                className={`text-4xl transition hover:scale-125 ${n <= rating ? "text-amber-500" : "text-slate-300 hover:text-amber-300"}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <Field label="Comment (optional)">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="How was your experience?" />
        </Field>
        <Field label="Photos (optional)">
          <ImageUploader multiple max={4} value={photos} onChange={setPhotos} label="Add photos from the event" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Submit review</Button>
        </div>
      </form>
    </Modal>
  );
}
