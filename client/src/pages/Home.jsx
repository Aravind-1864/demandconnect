import { Link } from "react-router-dom";
import { homeFor, useAuth } from "../context/AuthContext";
import useFetch from "../utils/useFetch";
import { CATEGORY_IMAGES, IMG, sized } from "../utils/images";
import ProviderCard from "../components/ProviderCard";
import { Button } from "../components/ui";

const CATEGORIES = [
  { slug: "photography", name: "Photography", tag: "Candid, cinematic, traditional" },
  { slug: "catering", name: "Catering", tag: "Feasts for 50 to 2,000" },
  { slug: "decoration", name: "Decoration", tag: "Stages, mandaps, themes" },
  { slug: "makeup", name: "Makeup", tag: "Bridal and party looks" },
  { slug: "dj", name: "DJ & Music", tag: "Sound, lights, sangeet" },
  { slug: "florist", name: "Florists", tag: "Bouquets and garlands" },
];

const STEPS = [
  { n: "01", title: "Post your requirement", text: "Describe the date, city and budget, or just tell our assistant in your own words." },
  { n: "02", title: "Receive proposals", text: "Local providers send priced offers that spell out exactly what is included." },
  { n: "03", title: "Compare and accept", text: "Line prices, inclusions and ratings up side by side, then choose with confidence." },
  { n: "04", title: "Book and review", text: "Track the booking through to the day, then leave an honest review." },
];

export default function Home() {
  const { user } = useAuth();
  const { data: featured } = useFetch("/providers", { sort: "rating", limit: 3 });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 to-slate-50">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> Local event services, matched to you
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] text-slate-900 sm:text-6xl lg:text-7xl">
              Every great event starts with the <em className="text-brand-600">right people.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Tell us what you are planning. Photographers, caterers, decorators and more send you real proposals, and you
              book the ones you love.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              {user ? (
                <Link to={homeFor(user.role)}><Button size="lg">Go to my dashboard</Button></Link>
              ) : (
                <>
                  <Link to="/register"><Button size="lg">Plan an event</Button></Link>
                  <Link to="/providers"><Button size="lg" variant="secondary">Browse providers</Button></Link>
                </>
              )}
            </div>
            <p className="mt-6 text-sm text-slate-500">Free for customers. Providers pay nothing to send proposals.</p>
          </div>

          <div className="relative mx-auto grid w-full max-w-xl grid-cols-5 grid-rows-6 gap-3 sm:gap-4" style={{ aspectRatio: "1 / 1.05" }}>
            <img src={IMG.heroMain} alt="Couple celebrating under confetti" className="arch col-span-3 row-span-6 h-full w-full object-cover shadow-xl" />
            <img src={IMG.heroFood} alt="A catered feast" className="col-span-2 row-span-2 h-full w-full rounded-2xl object-cover shadow-lg" />
            <img src={IMG.heroDecor} alt="Decorated wedding venue" className="col-span-2 row-span-2 h-full w-full rounded-2xl object-cover shadow-lg" />
            <img src={IMG.heroMakeup} alt="Bridal makeup" className="col-span-2 row-span-2 h-full w-full rounded-2xl object-cover shadow-lg" />
            <div className="absolute -bottom-4 -left-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:-left-6">
              <p className="text-xs text-slate-500">Proposal received</p>
              <p className="font-display text-lg font-semibold text-slate-900">₹38,000 · Candid + album</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-brand-600">Browse by service</p>
            <h2 className="mt-2 text-4xl font-semibold text-slate-900">Everything your event needs</h2>
          </div>
          <Link to="/providers" className="font-semibold text-brand-600 hover:text-brand-700">See all providers →</Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 sm:gap-6">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} to={`/providers?category=${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-slate-200 sm:aspect-[5/6]">
              <img src={sized(CATEGORY_IMAGES[c.slug], 700)} alt={c.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 p-5 text-white">
                <h3 className="text-2xl font-semibold">{c.name}</h3>
                <p className="mt-0.5 text-sm text-white/80">{c.tag}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Two modes */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-brand-600">Your way</p>
            <h2 className="mt-2 text-4xl font-semibold text-slate-900">Two ways to find the right provider</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
              <img src={IMG.manual} alt="Beautifully set wedding table" loading="lazy" className="h-64 w-full object-cover" />
              <div className="p-8">
                <h3 className="text-2xl font-semibold text-slate-900">Manual Mode</h3>
                <p className="mt-2 leading-relaxed text-slate-600">
                  Search, filter by city, price and rating, read reviews and study portfolios. Then request quotes from the providers you like.
                </p>
                <Link to="/providers" className="mt-5 inline-block font-semibold text-brand-600 hover:text-brand-700">Browse providers →</Link>
              </div>
            </article>
            <article className="overflow-hidden rounded-3xl border border-brand-200 bg-brand-50/60">
              <img src={IMG.ai} alt="Colourful celebration" loading="lazy" className="h-64 w-full object-cover" />
              <div className="p-8">
                <h3 className="text-2xl font-semibold text-slate-900">AI Mode</h3>
                <p className="mt-2 leading-relaxed text-slate-600">
                  Describe your event in plain language. We pull out the details, you confirm them, and we rank real providers by price, area, availability and ratings, with the reasons shown.
                </p>
                <Link to={user ? "/ai/describe" : "/register"} className="mt-5 inline-block font-semibold text-brand-600 hover:text-brand-700">Describe my event →</Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured?.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-600">Top rated</p>
          <h2 className="mt-2 text-4xl font-semibold text-slate-900">Providers customers love</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <ProviderCard key={p._id} provider={p} />)}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="border-y border-slate-200 bg-slate-100/60">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-4xl font-semibold text-slate-900">How it works</h2>
          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="font-display text-5xl font-semibold text-brand-200">{s.n}</span>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden">
        <img src={IMG.cta} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-slate-900/70" />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center text-white sm:px-6">
          <h2 className="text-4xl font-semibold sm:text-5xl">Ready to plan something unforgettable?</h2>
          <p className="mt-4 text-lg text-white/80">Post your first requirement in under two minutes.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={user ? "/choose-mode" : "/register"}><Button size="lg">Get started</Button></Link>
            {!user && (
              <Link to="/register?role=PROVIDER">
                <Button size="lg" variant="secondary">Offer your services</Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
