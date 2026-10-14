import { Link, useSearchParams } from "react-router-dom";
import useFetch from "../../utils/useFetch";
import ProviderCard from "../../components/ProviderCard";
import { Alert, Button, EmptyState, PageLoader } from "../../components/ui";

/** Public, read-only view of a shortlist shared by link. */
export default function Shortlist() {
  const [params] = useSearchParams();
  const ids = (params.get("ids") || "").split(",").filter(Boolean).slice(0, 6);
  const { data, loading, error } = useFetch(ids.length ? "/providers/batch" : null, { ids: ids.join(",") });

  if (loading) return <PageLoader />;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-semibold text-slate-900">A shared shortlist</h1>
      <p className="mt-2 text-slate-500">Someone picked these providers for an upcoming event.</p>
      <div className="mt-8">
        <Alert>{error}</Alert>
        {!data?.length ? (
          <EmptyState title="This shortlist is empty" action={<Link to="/providers"><Button>Browse providers</Button></Link>} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => <ProviderCard key={p._id} provider={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
