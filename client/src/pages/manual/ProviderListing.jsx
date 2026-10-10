import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import useFetch from "../../utils/useFetch";
import ProviderCard from "../../components/ProviderCard";
import SearchFilters from "../../components/SearchFilters";
import { IMG } from "../../utils/images";
import { Alert, Button, EmptyState, PageLoader } from "../../components/ui";

const DEFAULTS = { q: "", category: "", location: "", maxPrice: "", minRating: "", sort: "rating" };

export default function ProviderListing() {
  // Filters live in the URL so searches are shareable and survive refresh/back.
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => ({ ...DEFAULTS, ...Object.fromEntries(params) }), [params]);
  const page = Number(params.get("page")) || 1;

  const { data: categories } = useFetch("/categories");
  const query = useMemo(() => {
    const q = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v !== "" && k !== "page"));
    return { ...q, page, limit: 12 };
  }, [filters, page]);
  const { data: providers, meta, loading, error } = useFetch("/providers", query);

  const apply = (next) => {
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== "" && v !== DEFAULTS.sort));
    setParams(clean);
  };
  const goPage = (p) => setParams({ ...Object.fromEntries(params), page: String(p) });

  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <img src={IMG.browse} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-slate-900/65" />
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 text-white sm:px-6">
          <h1 className="text-4xl font-semibold sm:text-5xl">Find local providers</h1>
          <p className="mt-3 max-w-xl text-white/80">Browse verified professionals for your event, then request quotes from the ones you like.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
      <div className="relative z-10 -mt-12"><SearchFilters value={filters} categories={categories || []} onApply={apply} /></div>

      <div className="mt-8">
        {loading && <PageLoader label="Searching providers…" />}
        <Alert>{error}</Alert>

        {!loading && !error && providers?.length === 0 && (
          <EmptyState
            title="No providers match your filters"
            description="Try a different city, a higher price limit, or remove some filters."
            action={<Button variant="secondary" onClick={() => apply(DEFAULTS)}>Clear filters</Button>}
          />
        )}

        {!loading && providers?.length > 0 && (
          <>
            <p className="mb-4 text-sm text-slate-500">
              {meta?.total} provider{meta?.total === 1 ? "" : "s"} found
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((p) => (
                <ProviderCard key={p._id} provider={p} />
              ))}
            </div>

            {meta?.pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
                  ← Previous
                </Button>
                <span className="text-sm text-slate-500">
                  Page {page} of {meta.pages}
                </span>
                <Button variant="secondary" size="sm" disabled={page >= meta.pages} onClick={() => goPage(page + 1)}>
                  Next →
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
