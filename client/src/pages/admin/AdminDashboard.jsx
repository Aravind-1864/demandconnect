import { useState } from "react";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../utils/useFetch";
import { formatDate, formatINR } from "../../utils/format";
import { CountUp, Reveal } from "../../components/motion";
import { BarChart, Meter } from "../../components/visual";
import { Alert, Badge, Button, Card, Field, Input, PageHeader, PageLoader } from "../../components/ui";

const TABS = ["Overview", "Verification", "Providers", "Users", "Categories"];

function Stat({ label, value, prefix = "" }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-slate-900">
        {prefix}
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </p>
    </Card>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("Overview");
  const { data: stats, loading } = useFetch("/admin/stats");

  if (loading) return <PageLoader />;

  return (
    <>
      <PageHeader title="Administration" subtitle="Platform overview and moderation." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal><Stat label="Users" value={stats.users} /></Reveal>
        <Reveal delay={80}><Stat label="Providers" value={stats.providers} /></Reveal>
        <Reveal delay={160}><Stat label="Open requests" value={stats.openRequests} /></Reveal>
        <Reveal delay={240}><Stat label="Booked value" value={stats.bookedValue} prefix="₹" /></Reveal>
      </div>

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
            {t === "Verification" && stats.unverifiedProviders > 0 && <span className="ml-1.5 text-xs text-slate-400">({stats.unverifiedProviders})</span>}
          </button>
        ))}
      </div>

      <div className="mt-6 animate-fade-in" key={tab}>
        {tab === "Overview" && <OverviewTab />}
        {tab === "Verification" && <VerificationTab />}
        {tab === "Providers" && <ProvidersTab />}
        {tab === "Users" && <UsersTab />}
        {tab === "Categories" && <CategoriesTab />}
      </div>
    </>
  );
}

function Table({ head, children }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </Card>
  );
}

function useAction(reload) {
  const [error, setError] = useState("");
  const run = async (fn) => {
    setError("");
    try {
      await fn();
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return [error, run];
}

function OverviewTab() {
  const { data, loading, error } = useFetch("/admin/analytics");
  if (loading) return <PageLoader />;
  if (error) return <Alert>{error}</Alert>;
  const maxCat = Math.max(1, ...data.byCategory.map((c) => c.count));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-slate-900">New requirements, last 14 days</h2>
        <div className="mt-6">
          <BarChart
            height={170}
            data={data.requestsByDay.map((d) => ({ label: d.date.slice(8), key: d.date, value: d.count }))}
            format={(v) => `${v} request${v === 1 ? "" : "s"}`}
          />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Demand by category</h2>
        {data.byCategory.length === 0 && <p className="text-sm text-slate-400">No requests yet.</p>}
        {data.byCategory.map((c) => (
          <Meter key={c.name} label={c.name} value={c.count} max={maxCat} hint={`${c.count} request${c.count === 1 ? "" : "s"}`} />
        ))}
      </Card>

      <Card className="p-6 lg:col-span-2">
        <h2 className="text-xl font-semibold text-slate-900">Top providers by completed work</h2>
        {data.topProviders.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No completed bookings yet.</p>
        ) : (
          <ol className="mt-4 divide-y divide-slate-100">
            {data.topProviders.map((p, i) => (
              <li key={p._id} className="flex items-center gap-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 font-display font-semibold text-brand-700">{i + 1}</span>
                <span className="flex-1 font-semibold text-slate-900">{p.businessName}</span>
                <span className="text-sm text-slate-500">{p.jobs} job{p.jobs === 1 ? "" : "s"}</span>
                <span className="w-28 text-right font-semibold text-slate-900">{formatINR(p.value)}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function VerificationTab() {
  const { data, loading, error, reload } = useFetch("/admin/providers");
  const [actionError, run] = useAction(reload);
  if (loading) return <PageLoader />;

  const pending = data.filter((p) => p.verification?.status === "PENDING");
  return (
    <>
      <Alert>{error || actionError}</Alert>
      {pending.length === 0 ? (
        <Card className="p-10 text-center text-slate-500">No verification requests waiting. 🎉</Card>
      ) : (
        <div className="space-y-4">
          {pending.map((p) => (
            <Card key={p._id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold text-slate-900">{p.businessName}</p>
                <p className="text-sm text-slate-500">{p.user?.name} · {p.user?.email} · {p.location}</p>
                <a href={p.verification.documentUrl} target="_blank" rel="noreferrer noopener" className="mt-1 inline-block text-sm font-semibold text-brand-600 hover:underline">
                  Open submitted document ↗
                </a>
                <p className="text-xs text-slate-400">Submitted {formatDate(p.verification.submittedAt)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="success" size="sm" onClick={() => run(() => api.patch(`/admin/providers/${p._id}/verify`, { verified: true }))}>Approve</Button>
                <Button variant="secondary" size="sm" onClick={() => run(() => api.patch(`/admin/providers/${p._id}/verify`, { verified: false }))}>Reject</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function ProvidersTab() {
  const { data, loading, error, reload } = useFetch("/admin/providers");
  const [actionError, run] = useAction(reload);
  if (loading) return <PageLoader />;
  return (
    <>
      <Alert>{error || actionError}</Alert>
      <Table head={["Business", "Owner", "City", "Rating", "Status", ""]}>
        {data.map((p) => (
          <tr key={p._id}>
            <td className="px-4 py-3 font-medium text-slate-900">{p.businessName}</td>
            <td className="px-4 py-3 text-slate-500">{p.user?.name}<br /><span className="text-xs">{p.user?.email}</span></td>
            <td className="px-4 py-3">{p.location}</td>
            <td className="px-4 py-3">{p.ratingCount ? `${p.ratingAverage.toFixed(1)} (${p.ratingCount})` : "—"}</td>
            <td className="px-4 py-3"><Badge tone={p.verified ? "green" : p.verification?.status === "PENDING" ? "amber" : "slate"}>{p.verified ? "Verified" : p.verification?.status === "PENDING" ? "Pending" : "Unverified"}</Badge></td>
            <td className="px-4 py-3 text-right">
              <Button size="sm" variant={p.verified ? "secondary" : "primary"} onClick={() => run(() => api.patch(`/admin/providers/${p._id}/verify`, { verified: !p.verified }))}>
                {p.verified ? "Revoke" : "Verify"}
              </Button>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

function UsersTab() {
  const { data, loading, error, reload } = useFetch("/admin/users");
  const [actionError, run] = useAction(reload);
  if (loading) return <PageLoader />;
  return (
    <>
      <Alert>{error || actionError}</Alert>
      <Table head={["Name", "Email", "Role", "Joined", "Status", ""]}>
        {data.map((u) => (
          <tr key={u._id}>
            <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
            <td className="px-4 py-3 text-slate-500">{u.email}</td>
            <td className="px-4 py-3"><Badge tone={u.role === "ADMIN" ? "violet" : u.role === "PROVIDER" ? "blue" : "slate"}>{u.role}</Badge></td>
            <td className="px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
            <td className="px-4 py-3"><Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Disabled"}</Badge></td>
            <td className="px-4 py-3 text-right">
              {u.role !== "ADMIN" && (
                <Button size="sm" variant="secondary" onClick={() => run(() => api.patch(`/admin/users/${u._id}`, { isActive: !u.isActive }))}>
                  {u.isActive ? "Disable" : "Enable"}
                </Button>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

function CategoriesTab() {
  const { data, loading, error, reload } = useFetch("/admin/categories");
  const [actionError, run] = useAction(reload);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (loading) return <PageLoader />;
  return (
    <>
      <Alert>{error || actionError}</Alert>
      <Card className="mb-6 p-5">
        <form
          className="grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api.post("/admin/categories", { name, description });
              setName("");
              setDescription("");
            });
          }}
        >
          <Field label="New category"><Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></Field>
          <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <Button type="submit">Add</Button>
        </form>
      </Card>
      <Table head={["Name", "Slug", "Status", ""]}>
        {data.map((c) => (
          <tr key={c._id}>
            <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
            <td className="px-4 py-3 text-slate-500">{c.slug}</td>
            <td className="px-4 py-3"><Badge tone={c.active ? "green" : "slate"}>{c.active ? "Active" : "Hidden"}</Badge></td>
            <td className="px-4 py-3 text-right">
              <Button size="sm" variant="secondary" onClick={() => run(() => api.patch(`/admin/categories/${c._id}`, { active: !c.active }))}>
                {c.active ? "Hide" : "Show"}
              </Button>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
