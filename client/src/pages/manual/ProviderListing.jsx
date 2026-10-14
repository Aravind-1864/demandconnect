import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import useFetch from "../../utils/useFetch";
import ProviderCard from "../../components/ProviderCard";
import SearchFilters, { FILTER_DEFAULTS } from "../../components/SearchFilters";
import { MapView } from "../../components/visual";
import { ProviderCardSkeleton, Reveal } from "../../components/motion";
import { Alert, Button, EmptyState } from "../../components/ui";

export default function ProviderListing() {
  // Filters live in the URL so searches are shareable and survive refresh/back.
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => ({ ...FILTER_DEFAULTS, ...Object.fromEntries(params) }), [params]);
  const page = Number(params.get("page")) || 1;
  const view = params.get("view") === "map" ? "map" : "grid";

  const { data: categories } = useFetch("/categories");
  const query = useMemo(() => {
    const q = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v !== "" && !["page", "view"].includes(k)));
    return { ...q, page: view === "map" ? 1 : page, limit: view === "map" ? 50 : 12 };
  }, [filters, page, view]);
  const { data: providers, meta, loading, error } = useFetch("/providers", query);

  const apply = (next) => {
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== "" && v !== FILTER_DEFAULTS.sort));
    if (view === "map") clean.view = "map";
    setParams(clean);
  };
  const goPage = (p) => setParams({ ...Object.fromEntries(params), page: String(p) });
  const setView = (v) => {
    const next = Object.fromEntries(params);
    delete next.page;
    if (v === "map") next.view = "map";
    else delete next.view;
    setParams(next);
  };

  return (
    <div>
      <section className="mx-auto max-w-[1360px] px-4 pb-6 pt-6 sm:px-8 sm:pt-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">Explore Providers</h1>
            <p className="mt-1.5 text-sm sm:text-base text-slate-500 max-w-lg">
              Find and compare top-rated local event professionals, reviews, and verified portfolios.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1360px] px-4 pb-20 sm:px-8">
        <div className="relative z-10">
          <SearchFilters value={filters} categories={categories || []} onApply={apply} />
        </div>

        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {loading ? "Searching…" : `${meta?.total ?? providers?.length ?? 0} provider${(meta?.total ?? providers?.length) === 1 ? "" : "s"} found`}
              {filters.date && <span className="ml-1">available on {filters.date}</span>}
            </p>
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1" role="tablist" aria-label="Result view">
              {[["grid", "▦ Grid"], ["map", "◉ Map"]].map(([v, label]) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${view === v ? "bg-brand-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Alert>{error}</Alert>

          {loading && (
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <ProviderCardSkeleton key={i} />)}
            </div>
          )}

          {!loading && !error && providers?.length === 0 && (
            <EmptyState
              title="No providers match your filters"
              description="Try a different city, date or price limit, or remove some filters."
              action={<Button variant="secondary" onClick={() => apply(FILTER_DEFAULTS)}>Clear filters</Button>}
            />
          )}

          {!loading && providers?.length > 0 && view === "map" && (
            <>
              <MapView providers={providers} />
              <p className="mt-3 text-xs text-slate-400">Pins are placed by city. Click a pin to see the providers there.</p>
            </>
          )}

          {!loading && providers?.length > 0 && view === "grid" && (
            <>
              <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {providers.map((p, i) => (
                  <Reveal key={p._id} delay={(i % 3) * 80}>
                    <ProviderCard provider={p} />
                  </Reveal>
                ))}
              </div>

              {meta?.pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>← Previous</Button>
                  <span className="text-sm text-slate-500">Page {page} of {meta.pages}</span>
                  <Button variant="secondary" size="sm" disabled={page >= meta.pages} onClick={() => goPage(page + 1)}>Next →</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
