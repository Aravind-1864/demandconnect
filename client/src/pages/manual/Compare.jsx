import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCollections } from "../../context/CollectionsContext";
import useFetch from "../../utils/useFetch";
import { formatINR } from "../../utils/format";
import { providerCover, sized } from "../../utils/images";
import { Alert, Badge, Button, EmptyState, PageLoader, Stars } from "../../components/ui";

export default function Compare() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { compare, toggleCompare } = useCollections();
  const ids = (params.get("ids") || "").split(",").filter(Boolean).slice(0, 3);
  const { data, loading, error } = useFetch(ids.length ? "/providers/batch" : null, { ids: ids.join(",") });

  if (loading) return <PageLoader />;
  if (!ids.length || !data?.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Alert>{error}</Alert>
        <EmptyState
          title="Nothing to compare yet"
          description="Tick “Compare” on up to three provider cards and they will appear side by side here."
          action={<Link to="/providers"><Button>Browse providers</Button></Link>}
        />
      </div>
    );
  }

  const providers = ids.map((id) => data.find((p) => p._id === id)).filter(Boolean);
  const prices = providers.map((p) => p.startingPrice || Infinity);
  const bestPrice = Math.min(...prices);
  const bestRating = Math.max(...providers.map((p) => (p.ratingCount ? p.ratingAverage : 0)));
  const bestExp = Math.max(...providers.map((p) => p.experienceYears || 0));
  const allSkills = [...new Set(providers.flatMap((p) => p.skills || []))].sort();

  const remove = (id) => {
    if (compare.includes(id)) toggleCompare(id);
    const next = ids.filter((x) => x !== id);
    navigate(next.length ? `/compare?ids=${next.join(",")}` : "/compare", { replace: true });
  };

  const Row = ({ label, children }) => (
    <tr className="border-t border-slate-100">
      <th scope="row" className="w-40 bg-slate-50 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</th>
      {children}
    </tr>
  );
  const Cell = ({ best, children }) => (
    <td className={`px-4 py-4 text-sm ${best ? "bg-emerald-50/60 font-semibold text-emerald-800" : "text-slate-700"}`}>
      {children}
      {best && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-emerald-600">Best</span>}
    </td>
  );

  return (
    <div className="mx-auto max-w-6xl animate-fade-up px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-semibold text-slate-900">Compare providers</h1>
      <p className="mt-2 text-slate-500">The best value in each row is highlighted.</p>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className="bg-slate-50" />
              {providers.map((p) => (
                <th key={p._id} className="px-4 py-5 text-left align-top">
                  <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-200">
                    <img src={sized(providerCover(p), 500)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <p className="mt-3 font-display text-lg font-semibold text-slate-900">{p.businessName}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {p.verified && <Badge tone="green">✓ Verified</Badge>}
                    {p.categories.map((c) => <Badge key={c._id} tone="brand">{c.name}</Badge>)}
                  </div>
                  <button onClick={() => remove(p._id)} className="mt-2 text-xs font-medium text-slate-400 hover:text-red-600">Remove</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Starting price">
              {providers.map((p) => <Cell key={p._id} best={providers.length > 1 && p.startingPrice === bestPrice && p.startingPrice > 0}>{p.startingPrice ? formatINR(p.startingPrice) : "On request"}</Cell>)}
            </Row>
            <Row label="Rating">
              {providers.map((p) => (
                <Cell key={p._id} best={bestRating > 0 && p.ratingCount > 0 && p.ratingAverage === bestRating}>
                  <Stars value={p.ratingAverage} count={p.ratingCount} />
                </Cell>
              ))}
            </Row>
            <Row label="Experience">
              {providers.map((p) => <Cell key={p._id} best={bestExp > 0 && p.experienceYears === bestExp}>{p.experienceYears} years</Cell>)}
            </Row>
            <Row label="Based in">
              {providers.map((p) => <Cell key={p._id}>📍 {p.location}</Cell>)}
            </Row>
            <Row label="Service areas">
              {providers.map((p) => <Cell key={p._id}>{(p.serviceAreas || []).join(", ") || p.location}</Cell>)}
            </Row>
            {allSkills.map((skill) => (
              <Row key={skill} label={skill.length > 22 ? skill.slice(0, 20) + "…" : skill}>
                {providers.map((p) => (
                  <td key={p._id} className="px-4 py-3 text-lg">
                    {(p.skills || []).some((s) => s.toLowerCase() === skill.toLowerCase()) ? <span className="text-emerald-600">✓</span> : <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </Row>
            ))}
            <Row label="">
              {providers.map((p) => (
                <td key={p._id} className="px-4 py-4">
                  <Link to={`/providers/${p._id}`}><Button size="sm" className="w-full">View profile</Button></Link>
                </td>
              ))}
            </Row>
          </tbody>
        </table>
      </div>
    </div>
  );
}
