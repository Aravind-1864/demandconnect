import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useFetch from "../../utils/useFetch";
import { formatINR } from "../../utils/format";
import { Alert, Button, PageHeader, PageLoader, Stars } from "../../components/ui";
import { StatCard } from "../customer/Dashboard";

export default function ProviderDashboard() {
  const { user, hasProfile } = useAuth();
  const { data: profile, loading } = useFetch(hasProfile ? "/providers/me" : null);
  const { data: proposals } = useFetch("/proposals/mine");
  const { data: bookings } = useFetch("/bookings/mine");

  if (loading) return <PageLoader />;

  const pending = (proposals || []).filter((p) => p.status === "PENDING").length;
  const active = (bookings || []).filter((b) => ["CONFIRMED", "IN_PROGRESS"].includes(b.status));
  const earned = (bookings || []).filter((b) => b.status === "COMPLETED").reduce((s, b) => s + b.agreedPrice, 0);

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle={profile ? profile.businessName : "Set up your profile to start receiving requests."}
        actions={<Link to="/provider/requests"><Button>Find requirements</Button></Link>}
      />

      {!hasProfile && (
        <Alert tone="warning" className="mb-6">
          You haven't published a profile yet. <Link to="/provider/profile" className="font-semibold underline">Create it now</Link> so customers can find you.
        </Alert>
      )}
      {profile && !profile.verified && (
        <Alert tone="info" className="mb-6">Your profile is awaiting verification by an administrator. Verified providers get a badge and rank higher in trust.</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending proposals" value={pending} to="/provider/proposals" />
        <StatCard label="Active jobs" value={active.length} to="/provider/bookings" />
        <StatCard label="Completed value" value={formatINR(earned)} />
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Rating</p>
          <div className="mt-2">{profile ? <Stars value={profile.ratingAverage} count={profile.ratingCount} size="text-xl" /> : "—"}</div>
        </div>
      </div>
    </>
  );
}
