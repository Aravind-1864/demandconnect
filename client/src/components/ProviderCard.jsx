import { Link } from "react-router-dom";
import { formatINR } from "../utils/format";
import { providerCover, sized } from "../utils/images";
import { CompareToggle, HeartButton } from "./widgets";

/** Editorial card: oversized rounded image, small uppercase tags, big title with an arrow. */
export default function ProviderCard({ provider, showActions = true }) {
  const { _id, businessName, categories = [], location, startingPrice, ratingAverage, ratingCount, verified } = provider;

  return (
    <article className="group relative">
      <Link to={`/providers/${_id}`} aria-label={`View ${businessName}`} className="block">

        {/* ── Lusion Style Card Container ─────────────────────────────────── */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-[1.6rem] bg-slate-900 border border-white/60 shadow-lg transition-all duration-700 ease-out group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-indigo-500/15">
          <img
            src={sized(providerCover(provider), 1000)}
            alt={`${businessName} work sample`}
            loading="lazy"
            style={{ willChange: "transform" }}
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
          />

          {/* Luminous frosted dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-80" />

          {/* Verified badge */}
          {verified && (
            <span className="absolute bottom-3.5 left-3.5 rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 shadow-sm transition-all duration-300">
              ✓ Verified
            </span>
          )}

          {/* Floating arrow button */}
          <span className="absolute bottom-3.5 right-3.5 flex h-10 w-10 translate-y-3 items-center justify-center rounded-full bg-white text-base text-slate-900 opacity-0 shadow-lg transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
            ↗
          </span>
        </div>

        {/* ── Text below image (Lusion uppercase subtitle format) ── */}
        <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          {[...categories.map((c) => c.name), location].filter(Boolean).join(" • ")}
        </p>

        <div className="mt-1 flex items-baseline justify-between gap-4">
          <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-brand-600">
            {businessName}
          </h3>

          <div className="shrink-0 text-right text-xs">
            <span className="font-bold text-slate-900">{startingPrice ? `from ${formatINR(startingPrice)}` : "On request"}</span>
            <span className="text-slate-500 ml-1.5">{ratingCount ? `★ ${ratingAverage.toFixed(1)}` : "New"}</span>
          </div>
        </div>

      </Link>

      {showActions && (
        <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
          <HeartButton providerId={_id} />
        </div>
      )}
      {showActions && (
        <div className="absolute left-4 top-4">
          <CompareToggle providerId={_id} />
        </div>
      )}
    </article>
  );
}
