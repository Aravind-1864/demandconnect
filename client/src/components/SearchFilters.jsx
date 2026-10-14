import { useEffect, useState } from "react";
import { todayInput } from "../utils/format";

export const FILTER_DEFAULTS = { q: "", category: "", location: "", date: "", maxPrice: "", minRating: "", sort: "rating" };

/** Modern, clean search & filter bar with streamlined inputs and clear actions */
export default function SearchFilters({ value, categories = [], onApply }) {
  const [draft, setDraft] = useState(value);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  const activeFilterCount = [
    draft.category,
    draft.location,
    draft.date,
    draft.maxPrice,
    draft.minRating && draft.minRating !== "Any",
  ].filter(Boolean).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    onApply(draft);
  };

  const handleReset = () => {
    setDraft(FILTER_DEFAULTS);
    onApply(FILTER_DEFAULTS);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all"
    >
      {/* Primary Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch gap-2 p-3 sm:p-4">
        {/* Keyword Search */}
        <div className="relative flex-1 flex items-center">
          <span className="absolute left-3.5 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search providers by name, services, or keywords..."
            value={draft.q}
            onChange={set("q")}
            className="w-full rounded-xl bg-slate-50 hover:bg-slate-100/70 focus:bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 border border-transparent focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition"
          />
        </div>

        {/* Category Selector */}
        <div className="w-full lg:w-48">
          <select
            value={draft.category}
            onChange={set("category")}
            className="w-full rounded-xl bg-slate-50 hover:bg-slate-100/70 focus:bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 border border-transparent focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Location Input */}
        <div className="w-full lg:w-48 relative flex items-center">
          <span className="absolute left-3 text-slate-400 text-xs">📍</span>
          <input
            type="text"
            placeholder="City (e.g. Hyderabad)"
            value={draft.location}
            onChange={set("location")}
            className="w-full rounded-xl bg-slate-50 hover:bg-slate-100/70 focus:bg-white pl-8 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 border border-transparent focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pt-1 lg:pt-0">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className={`inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
              showAdvanced || activeFilterCount > 0
                ? "bg-brand-50 text-brand-700 border border-brand-200"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            <span className="text-xs">{showAdvanced ? "▲" : "▼"}</span>
          </button>

          <button
            type="submit"
            className="flex-1 lg:flex-none inline-flex items-center justify-center h-10 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition active:scale-95 shadow-sm"
          >
            Search
          </button>
        </div>
      </div>

      {/* Expandable Advanced Filters Drawer */}
      {showAdvanced && (
        <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Event Date
              </label>
              <input
                type="date"
                min={todayInput()}
                value={draft.date}
                onChange={set("date")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Max Price (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Budget e.g. 50,000"
                value={draft.maxPrice}
                onChange={set("maxPrice")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Min Rating
              </label>
              <select
                value={draft.minRating}
                onChange={set("minRating")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                <option value="">Any Rating</option>
                <option value="3">★ 3.0 & above</option>
                <option value="4">★ 4.0 & above</option>
                <option value="4.5">★ 4.5 & above</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Sort By
              </label>
              <select
                value={draft.sort}
                onChange={set("sort")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                <option value="rating">Top Rated</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition"
            >
              Reset all filters
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center h-8 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold uppercase tracking-wider transition"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
