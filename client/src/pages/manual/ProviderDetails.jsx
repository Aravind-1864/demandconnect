import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useFetch from "../../utils/useFetch";
import { formatDate, formatINR } from "../../utils/format";
import { providerCover, sized } from "../../utils/images";
import { Alert, Badge, Button, Card, EmptyState, Modal, PageLoader, Stars } from "../../components/ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ProviderDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: p, loading, error } = useFetch(`/providers/${id}`);
  const { data: reviews } = useFetch(`/providers/${id}/reviews`);
  const [lightbox, setLightbox] = useState(null);

  if (loading) return <PageLoader />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><Alert>{error}</Alert></div>;

  const requestQuote = () => {
    const target = `/customer/requests/new?provider=${p._id}`;
    navigate(user ? target : "/login", { state: { from: target } });
  };
  const working = p.availability?.workingDays || [];
  const gallery = p.portfolio?.length ? p.portfolio : [];
  const canRequest = !user || user.role === "CUSTOMER";

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img src={sized(providerCover(p), 1800)} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-900/90 via-slate-900/45 to-slate-900/20" />
        <div className="mx-auto flex min-h-[340px] max-w-7xl flex-col justify-end px-4 pb-10 pt-24 text-white sm:px-6">
          <Link to="/providers" className="absolute left-4 top-6 text-sm text-white/80 hover:text-white sm:left-6">← All providers</Link>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="flex flex-wrap gap-2">
                {p.categories?.map((c) => (
                  <span key={c._id} className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">{c.name}</span>
                ))}
                {p.verified && <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold">✓ Verified</span>}
              </div>
              <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{p.businessName}</h1>
              <p className="mt-2 text-white/80">📍 {p.location} · {p.experienceYears} yrs experience</p>
              <div className="mt-2 text-white [&_*]:!text-white/90"><Stars value={p.ratingAverage} count={p.ratingCount} size="text-base" /></div>
            </div>
            <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
              <p className="text-xs uppercase tracking-wide text-slate-400">Starting from</p>
              <p className="font-display text-3xl font-semibold">{p.startingPrice ? formatINR(p.startingPrice) : "On request"}</p>
              {canRequest && <Button className="mt-3 w-full" onClick={requestQuote}>Request a quote</Button>}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <Card className="p-7">
            <h2 className="text-2xl font-semibold text-slate-900">About</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-600">{p.description || "This provider has not added a description yet."}</p>
            {p.skills?.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {p.skills.map((s) => <Badge key={s} tone="brand">{s}</Badge>)}
              </div>
            )}
          </Card>

          {gallery.length > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-semibold text-slate-900">Portfolio</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((url, i) => (
                  <button
                    key={url}
                    onClick={() => setLightbox(url)}
                    className={`group overflow-hidden rounded-2xl bg-slate-200 ${i === 0 ? "col-span-2 row-span-2" : ""}`}
                  >
                    <img
                      src={sized(url, i === 0 ? 1000 : 500)}
                      alt={`${p.businessName} work ${i + 1}`}
                      loading="lazy"
                      className="aspect-square h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          <Card className="p-7">
            <h2 className="text-2xl font-semibold text-slate-900">Reviews</h2>
            {reviews?.length ? (
              <ul className="mt-4 divide-y divide-slate-100">
                {reviews.map((r) => (
                  <li key={r._id} className="py-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{r.customer?.name || "Customer"}</span>
                      <span className="text-amber-500">{"★".repeat(r.rating)}<span className="text-slate-300">{"★".repeat(5 - r.rating)}</span></span>
                    </div>
                    {r.comment && <p className="mt-1 text-slate-600">{r.comment}</p>}
                    <p className="mt-1 text-xs text-slate-400">{formatDate(r.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4"><EmptyState title="No reviews yet" description="Reviews appear after customers complete a booking." /></div>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900">Service areas</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(p.serviceAreas?.length ? p.serviceAreas : [p.location]).map((a) => <Badge key={a} tone="blue">{a}</Badge>)}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900">Works on</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <span key={d} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${working.includes(i) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400 line-through"}`}>{d}</span>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">Exact availability is checked against your event date.</p>
          </Card>
        </aside>
      </div>

      <Modal open={!!lightbox} onClose={() => setLightbox(null)} title={p.businessName}>
        {lightbox && <img src={sized(lightbox, 1400)} alt="" className="max-h-[70vh] w-full rounded-xl object-contain" />}
      </Modal>
    </div>
  );
}
