import { Link } from "react-router-dom";
import { IMG } from "../utils/images";

const MODES = [
  {
    to: "/providers",
    image: IMG.manual,
    title: "Manual Mode",
    text: "Search and filter providers, compare prices and read reviews. Pick who you want, then post your requirement.",
    points: ["Full control over who you contact", "Filter by category, city, price and rating", "Best when you know what you want"],
    cta: "Browse providers",
  },
  {
    to: "/ai/describe",
    image: IMG.ai,
    title: "AI Mode",
    text: "Describe your event in your own words. We extract the details, you confirm them, and we rank real providers.",
    points: ["No forms to fill from scratch", "Matches use real prices, areas and availability", "See exactly why each provider was recommended"],
    cta: "Describe my event",
    highlight: true,
  },
];

export default function ChooseMode() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <h1 className="text-center text-5xl font-semibold text-slate-900">How would you like to plan?</h1>
      <p className="mt-3 text-center text-slate-500">Both modes use the same providers, proposals and bookings.</p>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {MODES.map((m) => (
          <Link
            key={m.title}
            to={m.to}
            className={`group flex flex-col overflow-hidden rounded-3xl border shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
              m.highlight ? "border-brand-200 bg-brand-50/60" : "border-slate-200 bg-white"
            }`}
          >
            <div className="h-56 overflow-hidden">
              <img src={m.image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            </div>
            <div className="flex flex-1 flex-col p-8">
              <h2 className="text-3xl font-semibold text-slate-900">{m.title}</h2>
              <p className="mt-2 text-slate-600">{m.text}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                {m.points.map((p) => <li key={p}>✓ {p}</li>)}
              </ul>
              <span className="mt-6 font-semibold text-brand-600 group-hover:text-brand-700">{m.cta} →</span>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-slate-500">
        Already know what you need?{" "}
        <Link to="/customer/requests/new" className="font-semibold text-brand-600 hover:text-brand-700">
          Post a requirement directly
        </Link>
      </p>
    </div>
  );
}
