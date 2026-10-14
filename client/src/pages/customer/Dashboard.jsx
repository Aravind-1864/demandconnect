import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useFetch from "../../utils/useFetch";
import { formatDate } from "../../utils/format";
import { Button, Card, EmptyState, PageHeader, PageLoader, StatusBadge } from "../../components/ui";

export function StatCard({ label, value, to }) {
  const body = (
    <div className="glass-card rounded-2xl p-5 border border-white/80 transition-all cursor-pointer">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-extrabold text-slate-900 tracking-tight">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { data: requests, loading } = useFetch("/requests/mine");
  const { data: bookings } = useFetch("/bookings/mine");

  if (loading) return <PageLoader />;

  const open = requests.filter((r) => r.status === "OPEN");
  const awaiting = open.reduce((n, r) => n + r.pendingProposals, 0);
  const active = (bookings || []).filter((b) => ["CONFIRMED", "IN_PROGRESS"].includes(b.status));

  return (
    <>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Hello, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-600">Here's what's happening with your events.</p>
        </div>
        <Link to="/choose-mode">
          <button className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition">
            + Plan a new event
          </button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open requirements" value={open.length} to="/customer/requests" />
        <StatCard label="Proposals to review" value={awaiting} to="/customer/requests" />
        <StatCard label="Active bookings" value={active.length} to="/customer/bookings" />
      </div>

      <h2 className="mb-4 mt-10 text-base font-bold text-slate-900 tracking-tight">Recent requirements</h2>
      {requests.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-white/80 p-10 sm:p-14 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50/80 border border-indigo-100 text-indigo-600 shadow-inner">
            ✦
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">No events yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600 leading-relaxed">
            Post your first requirement and let local providers come to you.
          </p>
          <div className="mt-6">
            <Link to="/choose-mode">
              <button className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider shadow-sm hover:scale-[1.02] active:scale-95 transition">
                Get started
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl divide-y divide-slate-100">
          {requests.slice(0, 5).map((r) => (
            <Link key={r._id} to={`/customer/requests/${r._id}/proposals`} className="flex items-center justify-between gap-4 p-4 hover:bg-white/60 transition">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{r.title}</p>
                <p className="text-xs text-slate-500">{r.location} · {formatDate(r.eventDate)}</p>
              </div>
              <div className="flex items-center gap-3">
                {r.pendingProposals > 0 && <span className="text-xs font-bold text-brand-600">{r.pendingProposals} proposal{r.pendingProposals > 1 ? "s" : ""}</span>}
                <StatusBadge status={r.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
