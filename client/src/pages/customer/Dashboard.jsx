import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useFetch from "../../utils/useFetch";
import { formatDate } from "../../utils/format";
import { Button, Card, EmptyState, PageHeader, PageLoader, StatusBadge } from "../../components/ui";

export function StatCard({ label, value, to }) {
  const body = (
    <Card className="p-5 transition hover:border-brand-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    </Card>
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
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        subtitle="Here's what's happening with your events."
        actions={<Link to="/choose-mode"><Button>+ Plan a new event</Button></Link>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open requirements" value={open.length} to="/customer/requests" />
        <StatCard label="Proposals to review" value={awaiting} to="/customer/requests" />
        <StatCard label="Active bookings" value={active.length} to="/customer/bookings" />
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold text-slate-900">Recent requirements</h2>
      {requests.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Post your first requirement and let local providers come to you."
          action={<Link to="/choose-mode"><Button>Get started</Button></Link>}
        />
      ) : (
        <Card className="divide-y divide-slate-100">
          {requests.slice(0, 5).map((r) => (
            <Link key={r._id} to={`/customer/requests/${r._id}/proposals`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{r.title}</p>
                <p className="text-sm text-slate-500">{r.location} · {formatDate(r.eventDate)}</p>
              </div>
              <div className="flex items-center gap-3">
                {r.pendingProposals > 0 && <span className="text-sm font-medium text-brand-600">{r.pendingProposals} proposal{r.pendingProposals > 1 ? "s" : ""}</span>}
                <StatusBadge status={r.status} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
