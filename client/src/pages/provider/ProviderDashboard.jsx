import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useFetch from "../../utils/useFetch";
import { formatINR } from "../../utils/format";
import { CountUp, Reveal } from "../../components/motion";
import { BarChart, Meter } from "../../components/visual";
import { Alert, Button, Card, PageHeader, PageLoader, Stars } from "../../components/ui";

function Stat({ label, children, to }) {
  const body = (
    <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-1 font-display text-3xl font-semibold text-slate-900">{children}</div>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function ProviderDashboard() {
  const { user, hasProfile } = useAuth();
  const { data: profile, loading } = useFetch(hasProfile ? "/providers/me" : null);
  const { data: stats } = useFetch(hasProfile ? "/providers/me/stats" : null);

  if (loading) return <PageLoader />;

  const sentTotal = stats ? Object.values(stats.proposals).reduce((a, b) => a + b, 0) : 0;
  const active = (stats?.bookings.CONFIRMED?.count || 0) + (stats?.bookings.IN_PROGRESS?.count || 0);

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
        <Alert tone="info" className="mb-6">
          {profile.verification?.status === "PENDING"
            ? "Your verification documents are being reviewed."
            : <>Get the Verified badge to earn customers' trust. <Link to="/provider/profile" className="font-semibold underline">Submit documents</Link></>}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal><Stat label="Total earned" to="/provider/bookings">₹<CountUp value={stats?.totalEarned || 0} /></Stat></Reveal>
        <Reveal delay={80}><Stat label="In pipeline">₹<CountUp value={stats?.pipelineValue || 0} /></Stat></Reveal>
        <Reveal delay={160}><Stat label="Active jobs" to="/provider/bookings"><CountUp value={active} /></Stat></Reveal>
        <Reveal delay={240}>
          <Card className="h-full p-5">
            <p className="text-sm text-slate-500">Rating</p>
            <div className="mt-2">{profile ? <Stars value={profile.ratingAverage} count={profile.ratingCount} size="text-xl" /> : "—"}</div>
          </Card>
        </Reveal>
      </div>

      {stats && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Reveal>
            <Card className="p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-2xl font-semibold text-slate-900">Earnings</h2>
                <span className="text-xs text-slate-400">Completed jobs, last 6 months</span>
              </div>
              <div className="mt-6">
                <BarChart
                  data={stats.months.map((m) => ({ label: m.label, key: m.year, value: m.total }))}
                  format={formatINR}
                />
              </div>
            </Card>
          </Reveal>

          <Reveal delay={120}>
            <Card className="space-y-5 p-6">
              <h2 className="text-2xl font-semibold text-slate-900">Performance</h2>
              <Meter label="Proposal acceptance" value={stats.acceptanceRate || 0} max={100} hint={stats.acceptanceRate === null ? "—" : `${stats.acceptanceRate}%`} />
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Proposals sent</span>
                <span className="font-semibold text-slate-900">{sentTotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Avg. time to quote</span>
                <span className="font-semibold text-slate-900">
                  {stats.avgResponseHours === null ? "—" : stats.avgResponseHours < 1 ? "< 1 hour" : `${stats.avgResponseHours} hours`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Pending proposals</span>
                <Link to="/provider/proposals" className="font-semibold text-brand-600">{stats.proposals.PENDING || 0}</Link>
              </div>
            </Card>
          </Reveal>
        </div>
      )}
    </>
  );
}
