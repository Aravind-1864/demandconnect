import { Link } from "react-router-dom";
import { formatINR } from "../utils/format";
import { providerCover, sized } from "../utils/images";
import { Stars } from "./ui";

export default function ProviderCard({ provider }) {
  const { _id, businessName, categories = [], location, startingPrice, skills = [], ratingAverage, ratingCount, verified } = provider;

  return (
    <Link
      to={`/providers/${_id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
        <img
          src={sized(providerCover(provider), 700)}
          alt={`${businessName} work sample`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        {verified && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow">✓ Verified</span>
        )}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {categories.slice(0, 2).map((c) => (
            <span key={c._id} className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
              {c.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-snug text-slate-900">{businessName}</h3>
          <Stars value={ratingAverage} count={ratingCount} />
        </div>
        <p className="mt-1 text-sm text-slate-500">📍 {location}</p>
        {skills.length > 0 && <p className="mt-3 line-clamp-1 text-xs text-slate-500">{skills.slice(0, 4).join(" · ")}</p>}

        <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Starting from</p>
            <p className="font-display text-xl font-semibold text-slate-900">{startingPrice ? formatINR(startingPrice) : "On request"}</p>
          </div>
          <span className="text-sm font-semibold text-brand-600 transition group-hover:translate-x-0.5">View →</span>
        </div>
      </div>
    </Link>
  );
}
