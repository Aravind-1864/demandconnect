import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errorMessage, unwrap } from "../../services/api";
import { formatINR } from "../../utils/format";
import { providerCover, sized } from "../../utils/images";
import { CountUp, Reveal, ScoreRing, Skeleton } from "../../components/motion";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Stars } from "../../components/ui";

const FACTORS = [
  ["skills", "Skills & requirements", "30%"],
  ["location", "Location", "20%"],
  ["availability", "Availability", "20%"],
  ["budget", "Budget fit", "20%"],
  ["experience", "Experience & rating", "10%"],
];

function Breakdown({ breakdown }) {
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {FACTORS.map(([key, label, weight]) => (
        <div key={key}>
          <dt className="flex justify-between text-xs text-slate-500">
            <span>{label} <span className="text-slate-300">({weight})</span></span>
            <span className="font-medium text-slate-700">{Math.round(breakdown[key])}</span>
          </dt>
          <dd className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500 transition-all duration-1000" style={{ width: `${breakdown[key]}%` }} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Packages({ data, requestId }) {
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState({});
  const [error, setError] = useState("");

  const inviteAll = async (pkg) => {
    setBusy(pkg.key);
    setError("");
    try {
      for (const item of pkg.items) await api.post(`/requests/${requestId}/invite`, { providerId: item.provider._id });
      setDone((d) => ({ ...d, [pkg.key]: true }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  if (!data.packages.length) {
    return <EmptyState title="No bundles available" description="We couldn't assemble a complete set for these services yet." />;
  }

  return (
    <div className="space-y-6">
      <Alert>{error}</Alert>
      <p className="text-sm text-slate-500">
        Complete vendor sets, one provider per service. Totals add up each provider's starting price, so treat them as estimates.
      </p>
      <div className="grid gap-6 lg:grid-cols-3">
        {data.packages.map((pkg, i) => (
          <Reveal key={pkg.key} delay={i * 100}>
            <Card className={`flex h-full flex-col p-6 ${i === 0 ? "ring-2 ring-brand-600" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">{pkg.label}</h3>
                  <p className="text-xs text-slate-400">Avg. match {pkg.avgScore}%</p>
                </div>
                {i === 0 && <Badge tone="brand">Recommended</Badge>}
              </div>

              <p className="mt-4 font-display text-4xl font-semibold text-slate-900">
                ₹<CountUp value={pkg.total} />
              </p>
              {pkg.withinBudget !== null && (
                <p className={`text-sm font-semibold ${pkg.withinBudget ? "text-emerald-600" : "text-red-600"}`}>
                  {pkg.withinBudget ? `Within your ${formatINR(data.budgetMax)} budget` : `Over your ${formatINR(data.budgetMax)} budget`}
                </p>
              )}

              <ul className="mt-5 flex-1 space-y-3">
                {pkg.items.map((it) => (
                  <li key={it.service}>
                    <Link to={`/providers/${it.provider._id}`} className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-slate-50">
                      <img src={sized(providerCover(it.provider), 160)} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand-600">{it.service}</span>
                        <span className="block truncate text-sm font-semibold text-slate-900">{it.provider.businessName}</span>
                        <span className="block text-xs text-slate-500">
                          {it.provider.startingPrice ? formatINR(it.provider.startingPrice) : "On request"} · {Math.round(it.score)}% match
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {pkg.missing.length > 0 && (
                <p className="mt-3 text-xs text-amber-600">No match yet for: {pkg.missing.join(", ")}</p>
              )}

              <Button className="mt-5 w-full" disabled={done[pkg.key]} loading={busy === pkg.key} onClick={() => inviteAll(pkg)}>
                {done[pkg.key] ? "✓ All invited to quote" : "Invite this bundle"}
              </Button>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

export default function Recommendations() {
  const { requestId } = useParams();
  const [result, setResult] = useState(null);
  const [pkgs, setPkgs] = useState(null);
  const [error, setError] = useState("");
  const [invited, setInvited] = useState({});
  const [showExcluded, setShowExcluded] = useState(false);
  const [tab, setTab] = useState("providers");

  const load = useCallback(async () => {
    setError("");
    try {
      const [rec, pk] = await Promise.all([
        api.post("/ai/recommendations", { requestId }),
        api.post("/ai/packages", { requestId }),
      ]);
      setResult(unwrap(rec));
      setPkgs(unwrap(pk));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const invite = async (providerId) => {
    try {
      await api.post(`/requests/${requestId}/invite`, { providerId });
      setInvited((s) => ({ ...s, [providerId]: true }));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!result && !error) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-72" />
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    );
  }

  const hasBundles = pkgs?.packages?.some((p) => p.items.length > 1);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Recommended for your event"
        subtitle="Ranked using each provider's real prices, service areas, availability and ratings."
        actions={
          <Link to={`/customer/requests/${requestId}/proposals`}>
            <Button variant="secondary">View proposals</Button>
          </Link>
        }
      />
      <Alert>{error}</Alert>

      {result && (
        <>
          <Alert tone="info" className="mb-6">
            Your requirement is saved and visible to providers. Invite the ones you like so they quote on it first.
          </Alert>

          {hasBundles && (
            <div className="mb-6 inline-flex rounded-full border border-slate-200 bg-white p-1" role="tablist">
              {[["providers", "Individual providers"], ["bundles", "✨ Complete bundles"]].map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab === key ? "bg-brand-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {tab === "bundles" && hasBundles ? (
            <Packages data={pkgs} requestId={requestId} />
          ) : result.matches.length === 0 ? (
            <EmptyState
              title="No confirmed matches yet"
              description="No provider currently satisfies your category, city, date and budget. Your requirement is still open, so providers can send proposals. You can also widen the budget or date."
              action={<Link to="/providers"><Button variant="secondary">Browse all providers</Button></Link>}
            />
          ) : (
            <ol className="space-y-5">
              {result.matches.map((m, i) => (
                <li key={m.provider._id}>
                  <Reveal delay={i * 90}>
                    <Card className="overflow-hidden p-0 transition hover:shadow-lg">
                      <div className="flex flex-col sm:flex-row">
                        <div className="relative h-44 shrink-0 sm:h-auto sm:w-52">
                          <img src={sized(providerCover(m.provider), 500)} alt="" className="h-full w-full object-cover" />
                          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">#{i + 1}</span>
                        </div>
                        <div className="flex-1 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xl font-semibold text-slate-900">{m.provider.businessName}</h3>
                                {m.provider.verified && <Badge tone="green">✓ Verified</Badge>}
                              </div>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
                                <span>📍 {m.provider.location}</span>
                                <span>From {m.provider.startingPrice ? formatINR(m.provider.startingPrice) : "—"}</span>
                                <Stars value={m.provider.ratingAverage} count={m.provider.ratingCount} />
                              </p>
                            </div>
                            <ScoreRing value={m.score} />
                          </div>
                          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                            <span className="font-semibold text-slate-900">Why this match: </span>
                            {m.explanation}
                          </p>
                          <Breakdown breakdown={m.breakdown} />
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button size="sm" disabled={invited[m.provider._id]} onClick={() => invite(m.provider._id)}>
                              {invited[m.provider._id] ? "✓ Invited to quote" : "Invite to quote"}
                            </Button>
                            <Link to={`/providers/${m.provider._id}`}><Button size="sm" variant="secondary">View profile</Button></Link>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Reveal>
                </li>
              ))}
            </ol>
          )}

          {tab === "providers" && result.excluded.length > 0 && (
            <div className="mt-8">
              <button className="text-sm font-medium text-slate-500 hover:text-slate-800" onClick={() => setShowExcluded((s) => !s)}>
                {showExcluded ? "Hide" : "Show"} {result.excluded.length} provider{result.excluded.length > 1 ? "s" : ""} that don't fit
              </button>
              {showExcluded && (
                <ul className="mt-3 animate-fade-in space-y-2">
                  {result.excluded.map((e) => (
                    <li key={e.provider._id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                      <span className="font-medium text-slate-800">{e.provider.businessName}</span>
                      <span className="text-slate-500"> — {e.reasons.join("; ")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
