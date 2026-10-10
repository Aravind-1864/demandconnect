import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errorMessage, unwrap } from "../../services/api";
import { formatINR } from "../../utils/format";
import { providerCover, sized } from "../../utils/images";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, PageLoader, Stars } from "../../components/ui";

const FACTORS = [
  ["skills", "Skills & requirements", "30%"],
  ["location", "Location", "20%"],
  ["availability", "Availability", "20%"],
  ["budget", "Budget fit", "20%"],
  ["experience", "Experience & rating", "10%"],
];

function ScoreBadge({ score }) {
  const tone = score >= 85 ? "bg-emerald-600" : score >= 65 ? "bg-brand-600" : "bg-amber-500";
  return (
    <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full text-white ${tone}`} title="Match score">
      <span className="text-lg font-bold leading-none">{Math.round(score)}%</span>
      <span className="text-[10px] uppercase tracking-wide opacity-80">match</span>
    </div>
  );
}

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
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${breakdown[key]}%` }} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function Recommendations() {
  const { requestId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [invited, setInvited] = useState({});
  const [showExcluded, setShowExcluded] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setResult(unwrap(await api.post("/ai/recommendations", { requestId })));
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

  if (!result && !error) return <PageLoader label="Matching providers to your event…" />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Recommended providers"
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

          {result.matches.length === 0 ? (
            <EmptyState
              title="No confirmed matches yet"
              description="No provider currently satisfies your category, city, date and budget. Your requirement is still open, so providers can send proposals. You can also widen the budget or date."
              action={
                <Link to="/providers"><Button variant="secondary">Browse all providers</Button></Link>
              }
            />
          ) : (
            <ol className="space-y-4">
              {result.matches.map((m, i) => (
                <li key={m.provider._id}>
                  <Card className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="relative hidden shrink-0 sm:block">
                        <img src={sized(providerCover(m.provider), 300)} alt="" className="h-28 w-28 rounded-2xl object-cover" />
                        <div className="absolute -bottom-3 -right-3"><ScoreBadge score={m.score} /></div>
                      </div>
                      <div className="sm:hidden"><ScoreBadge score={m.score} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-400">#{i + 1}</span>
                          <h3 className="text-lg font-semibold text-slate-900">{m.provider.businessName}</h3>
                          {m.provider.verified && <Badge tone="green">✓ Verified</Badge>}
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
                          <span>📍 {m.provider.location}</span>
                          <span>From {m.provider.startingPrice ? formatINR(m.provider.startingPrice) : "—"}</span>
                          <Stars value={m.provider.ratingAverage} count={m.provider.ratingCount} />
                        </p>
                        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                          <span className="font-medium text-slate-900">Why this match: </span>
                          {m.explanation}
                        </p>
                        <Breakdown breakdown={m.breakdown} />
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" disabled={invited[m.provider._id]} onClick={() => invite(m.provider._id)}>
                            {invited[m.provider._id] ? "✓ Invited to quote" : "Invite to quote"}
                          </Button>
                          <Link to={`/providers/${m.provider._id}`}>
                            <Button size="sm" variant="secondary">View profile</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          )}

          {result.excluded.length > 0 && (
            <div className="mt-8">
              <button className="text-sm font-medium text-slate-500 hover:text-slate-800" onClick={() => setShowExcluded((s) => !s)}>
                {showExcluded ? "Hide" : "Show"} {result.excluded.length} provider{result.excluded.length > 1 ? "s" : ""} that don't fit
              </button>
              {showExcluded && (
                <ul className="mt-3 space-y-2">
                  {result.excluded.map((e) => (
                    <li key={e.provider._id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
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
