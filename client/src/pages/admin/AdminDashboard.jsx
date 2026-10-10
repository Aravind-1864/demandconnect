import { useState } from "react";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../utils/useFetch";
import { formatDate, formatINR } from "../../utils/format";
import { Alert, Badge, Button, Card, Field, Input, PageHeader, PageLoader } from "../../components/ui";
import { StatCard } from "../customer/Dashboard";

const TABS = ["Providers", "Users", "Categories"];

export default function AdminDashboard() {
  const [tab, setTab] = useState("Providers");
  const { data: stats, loading } = useFetch("/admin/stats");

  if (loading) return <PageLoader />;

  return (
    <>
      <PageHeader title="Administration" subtitle="Platform overview and moderation." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={stats.users} />
        <StatCard label="Providers (unverified)" value={`${stats.providers} (${stats.unverifiedProviders})`} />
        <StatCard label="Open requests" value={`${stats.openRequests} / ${stats.requests}`} />
        <StatCard label="Booked value" value={formatINR(stats.bookedValue)} />
      </div>

      <div className="mt-8 flex gap-1 border-b border-slate-200" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
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
            <td className="px-4 py-3"><Badge tone={p.verified ? "green" : "amber"}>{p.verified ? "Verified" : "Unverified"}</Badge></td>
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
