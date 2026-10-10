import { useEffect, useState } from "react";
import { Button, Field, Input, Select } from "./ui";

/** Controlled filter bar. `value` is the applied filter object; edits are held locally until Apply. */
export default function SearchFilters({ value, categories = [], onApply }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(draft);
      }}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Search" className="lg:col-span-2">
          <Input placeholder="Name, skill or keyword…" value={draft.q} onChange={set("q")} />
        </Field>
        <Field label="Category">
          <Select value={draft.category} onChange={set("category")}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c.slug}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Location">
          <Input placeholder="e.g. Hyderabad" value={draft.location} onChange={set("location")} />
        </Field>
        <Field label="Max starting price (₹)">
          <Input type="number" min="0" placeholder="50000" value={draft.maxPrice} onChange={set("maxPrice")} />
        </Field>
        <Field label="Minimum rating">
          <Select value={draft.minRating} onChange={set("minRating")}>
            <option value="">Any</option>
            <option value="3">3★ and up</option>
            <option value="4">4★ and up</option>
            <option value="4.5">4.5★ and up</option>
          </Select>
        </Field>
        <Field label="Sort by">
          <Select value={draft.sort} onChange={set("sort")}>
            <option value="rating">Top rated</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="newest">Newest</option>
          </Select>
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" className="flex-1">Apply</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onApply({ q: "", category: "", location: "", maxPrice: "", minRating: "", sort: "rating" })}
          >
            Reset
          </Button>
        </div>
      </div>
    </form>
  );
}
