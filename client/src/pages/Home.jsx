import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { homeFor, useAuth } from "../context/AuthContext";
import useFetch from "../utils/useFetch";
import { CATEGORY_IMAGES, IMG, sized } from "../utils/images";
import ProviderCard from "../components/ProviderCard";
import { Marquee, Parallax, Reveal, SplitText } from "../components/motion";

const SERVICES = [
  { slug: "photography", name: "Photography", tag: "Candid · cinematic · traditional" },
  { slug: "catering", name: "Catering", tag: "Feasts for 50 to 2,000" },
  { slug: "decoration", name: "Decoration", tag: "Stages · mandaps · themes" },
  { slug: "makeup", name: "Makeup", tag: "Bridal and party looks" },
  { slug: "dj", name: "DJ & Music", tag: "Sound · lights · sangeet" },
  { slug: "florist", name: "Florists", tag: "Bouquets and garlands" },
];

const SHOWCASE = [
  { slug: "florist", name: "Florist", title: "Petal Poetry Florals", price: "₹12,000" },
  { slug: "makeup", name: "Makeup", title: "Glow by Sana", price: "₹15,000" },
  { slug: "photography", name: "Photography", title: "Frame & Fable Studio", price: "₹25,000" },
  { slug: "decoration", name: "Decoration", title: "Mandap Muse Decor", price: "₹40,000" },
];

const STEPS = [
  ["01", "Post your requirement", "Describe the date, city and budget. Or just tell our assistant in your own words."],
  ["02", "Receive proposals", "Local providers send priced offers that spell out exactly what is included."],
  ["03", "Compare and accept", "Line prices, inclusions and ratings up side by side, then choose with confidence."],
  ["04", "Book and review", "Track the booking through to the day, then leave an honest review."],
];


// Phones/tablets get the calm version: no per-frame scroll effects (they stutter on touch scrolling).
const isSmallScreen = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;

/** Lusion-style cyan ribbon that draws itself as its section scrolls through the viewport. */
function ScrollRibbon({ d, viewBox, width = 56, className = "", from = 0.15, span = 0.9, page = false }) {
  const wrap = useRef(null);
  const path = useRef(null);
  const id = useRef("rb" + Math.random().toString(36).slice(2, 8)).current;

  useEffect(() => {
    if (isSmallScreen()) return;
    // Page mode: sample the path once so the drawn head can follow the viewport's bottom edge.
    const vbH = Number(viewBox.split(" ")[3]);
    const samples = [];
    if (page && path.current) {
      const total = path.current.getTotalLength();
      let maxY = -Infinity;
      for (let i = 0; i <= 400; i++) {
        const pt = path.current.getPointAtLength((total * i) / 400);
        maxY = Math.max(maxY, pt.y);
        samples.push(maxY);
      }
    }
    let cur = 0;
    let raf = 0;
    let last = performance.now();
    const update = (now = performance.now()) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!wrap.current || !path.current) return;
      const r = wrap.current.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      let p;
      if (page) {
        // The drawn end rides with the middle of the screen: it only moves as you scroll
        // (down = draws further, up = pulls back) and is never ahead of your eyes.
        const scrolled = Math.max(0, -r.top);
        const reach = scrolled > 4 ? scrolled + vh * 0.5 * Math.min(1, scrolled / (vh * 0.25)) : 0;
        const targetY = (reach / r.height) * vbH;
        let i = reach === 0 ? -1 : samples.findIndex((y) => y >= targetY);
        if (i === -1 && reach > 0) i = samples.length - 1;
        const target = i < 0 ? 0 : i / (samples.length - 1);
        cur += (target - cur) * (1 - Math.exp(-dt / 0.12));
        if (Math.abs(target - cur) < 0.0005) cur = target;
        p = cur;
      } else {
        const t = (vh - r.top) / (vh + r.height);
        p = Math.min(1, Math.max(0, (t - from) / span));
      }
      path.current.style.strokeDashoffset = String(1 - p);
    };
    if (page) {
      const loop = (now) => { update(now); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [from, span, page, viewBox]);

  return (
    <div ref={wrap} aria-hidden className={`pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden md:block ${className}`}>
      <svg className="h-full w-full" viewBox={viewBox} preserveAspectRatio="none" fill="none">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="55%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <path
          ref={path}
          d={d}
          pathLength="1"
          stroke={`url(#${id})`}
          strokeWidth={width}
          strokeLinecap="round"
          style={{ strokeDasharray: 1, strokeDashoffset: 1, filter: "drop-shadow(0 14px 26px rgba(34,211,238,0.35))" }}
        />
      </svg>
    </div>
  );
}

const reelImg = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&h=1000&q=80`;
const REEL_PHONES = [
  { label: "Weddings", src: reelImg("1522673607200-164d1b6ce486") },
  { label: "Venues", src: reelImg("1519167758481-83f550bb49b3") },
  { label: "Celebrations", src: reelImg("1492684223066-81342ee5ff30") },
];

/**
 * Big red "reel" panel. Scroll-linked and eased: it starts small at the side of the screen and,
 * as you scroll, travels to the centre while growing to full width. Letters and phones follow --p.
 */
function ReelPanel() {
  const section = useRef(null);
  const panel = useRef(null);

  useEffect(() => {
    let cur = 0;
    let raf = 0;
    let last = performance.now();
    const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep
    const small = isSmallScreen(); // phones: grow in place, no sideways travel (it overflowed)

    const tick = (now = performance.now()) => {
      const dt = Math.min(0.05, (now - last) / 1000); // frame-rate independent damping
      last = now;
      const sec = section.current;
      const el = panel.current;
      if (sec && el) {
        const r = sec.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        const target = Math.min(1, Math.max(0, (vh * 1.0 - r.top) / (vh * (small ? 0.6 : 0.9))));
        cur += (target - cur) * (1 - Math.exp(-dt / 0.28)); // critically damped glide
        if (Math.abs(target - cur) < 0.0005) cur = target;
        const e = ease(cur);
        el.style.setProperty("--p", cur.toFixed(4));
        if (small) {
          el.style.transform = `translate3d(0, ${(1 - e) * 8}%, 0) scale(${0.82 + 0.18 * e})`;
          el.style.opacity = String(0.4 + 0.6 * e);
        } else {
          const x = (1 - e) * 58; // % of own width, from the right edge towards centre
          const sc = 0.34 + 0.66 * e;
          el.style.transform = `translate3d(${x}%, ${(1 - e) * 12}%, 0) scale(${sc}) rotate(${(1 - e) * -5}deg) skewY(var(--sk, 0deg))`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const letters = (word, base) =>
    word.split("").map((ch, i) => {
      const k = `clamp(0, (var(--p) - ${(0.62 + (base + i) * 0.018).toFixed(3)}) * 8, 1)`;
      return (
        <span
          key={i}
          className="inline-block"
          style={{ transition: "none", opacity: `calc(${k})`, transform: `translateY(calc((1 - ${k}) * 80%))` }}
        >
          {ch}
        </span>
      );
    });

  const plusRow = (
    <div aria-hidden className="flex justify-between px-1 font-sans text-lg leading-none text-slate-500">
      {[0, 1, 2, 3, 4].map((i) => <span key={i}>+</span>)}
    </div>
  );

  return (
    <section ref={section} className="mx-auto max-w-[1360px] overflow-x-clip px-4 pt-16 sm:px-8 sm:pt-20">
      {plusRow}
      <Link to="/providers" aria-label="Explore all services" className="group my-3 block">
        <div
          ref={panel}
          className="relative isolate overflow-hidden rounded-[1.6rem] bg-[#e5001c] shadow-2xl shadow-red-900/20 [--reel-ratio:4/3] sm:[--reel-ratio:16/7]"
          style={{ aspectRatio: "var(--reel-ratio)", minHeight: 240, willChange: "transform", transformOrigin: "50% 50%", transition: "none" }}
        >
          <div className="absolute inset-0 hidden items-center justify-center gap-[7%] px-[8%] py-[4%] sm:flex">
            {REEL_PHONES.map((ph, i) => (
              <div
                key={ph.label}
                className="relative h-full w-[17%] min-w-[84px] overflow-hidden rounded-xl bg-slate-900 shadow-xl"
                style={{ transition: "none", transform: `translateY(calc((1 - var(--p, 0)) * ${(i + 1) * 22}%))` }}
              >
                <div className="h-3 bg-slate-800" />
                <img src={ph.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-900">
                  {ph.label}
                </span>
              </div>
            ))}
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-4 font-display text-[2.6rem] font-medium leading-none tracking-wide text-white sm:flex-row sm:gap-8 sm:text-[clamp(1.3rem,3.6vw,3.4rem)]">
            <span className="flex justify-center overflow-hidden sm:w-[36%] sm:justify-end">{letters("EXPLORE", 0)}</span>
            <span className="grid h-12 w-20 shrink-0 place-items-center rounded-full bg-white text-slate-950 shadow-lg transition-transform duration-500 group-hover:scale-110 sm:h-16 sm:w-28">
              <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>
            </span>
            <span className="flex justify-center overflow-hidden sm:w-[36%] sm:justify-start">{letters("SERVICES", 7)}</span>
          </div>
        </div>
      </Link>
      {plusRow}
    </section>
  );
}

const Pill = ({ children, dark = false, className = "" }) => (
  <span
    className={`inline-flex h-12 items-center gap-3 rounded-full px-7 text-sm font-semibold uppercase tracking-wide transition hover:scale-[1.03] ${
      dark ? "bg-ink" : "bg-white/80 text-slate-900 ring-1 ring-slate-300"
    } ${className}`}
  >
    {children}
  </span>
);

export default function Home() {
  const { user } = useAuth();
  const { data: featured, loading: featuredLoading } = useFetch("/providers", { sort: "rating", limit: 4 });
  const hasFeatured = (featured || []).length > 0;
  const [hovered, setHovered] = useState(0);
  const gridRef = useRef(null);
  const rootRef = useRef(null);

  // Cards skew and blur with scroll speed, then settle: the Lusion "featured work" feel.
  useEffect(() => {
    if (isSmallScreen()) return;
    let last = window.scrollY;
    let v = 0;
    let raf = 0;
    const tick = () => {
      const cur = window.scrollY;
      v += (cur - last - v) * 0.12;
      last = cur;
      const el = rootRef.current;
      if (el) {
        const c = Math.max(-60, Math.min(60, v));
        el.style.setProperty("--sk", (c * 0.045).toFixed(2) + "deg");
        el.style.setProperty("--bl", Math.min(5, Math.abs(c) * 0.09).toFixed(2) + "px");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={rootRef} className="relative isolate">
      {/* One continuous ribbon behind the whole page: visible on load, keeps drawing as you scroll */}
      <ScrollRibbon
        page
        viewBox="0 0 1440 6000"
        width={52}
        d="M-120,640 C220,860 330,230 760,200 C1120,175 1300,330 1500,520 C1650,700 1300,900 900,950 C400,1010 100,1150 200,1500 C300,1850 1100,1700 1250,2100 C1380,2450 500,2450 300,2800 C150,3150 900,3250 1100,3600 C1250,3900 600,4100 400,4400 C250,4700 1000,4800 1150,5100 C1250,5350 700,5500 760,5800"
      />

      {/* Hero with Lusion-style dynamic ribbon & bold typography */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-[1360px] px-4 pb-12 pt-10 sm:px-8 sm:pt-16">
          {/* Centered Pill like Lusion's "SEE ALL PROJECTS" */}
          <div className="flex justify-center mb-6">
            <Link to="/providers">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-900 border border-white shadow-md hover:scale-105 active:scale-95 transition">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600"></span>
                Explore All Providers
              </span>
            </Link>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SplitText
              text="Where Great Events Become Reality."
              className="max-w-[15ch] font-display text-[clamp(2.5rem,6vw,5.5rem)] font-extrabold tracking-tight text-slate-950 leading-[0.98]"
            />
            <div className="max-w-md animate-fade-up pb-3 [animation-delay:700ms]">
              <p className="text-sm sm:text-base leading-relaxed text-slate-700 font-sans">
                Post requirements once, receive verified proposals, and book trusted local event pros with confidence.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {user ? (
                  <Link to={homeFor(user.role)}>
                    <span className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-7 text-xs font-bold uppercase tracking-wider text-white shadow-lg hover:scale-105 active:scale-95 transition">
                      Open Dashboard →
                    </span>
                  </Link>
                ) : (
                  <>
                    <Link to="/register">
                      <span className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-7 text-xs font-bold uppercase tracking-wider text-white shadow-lg hover:scale-105 active:scale-95 transition">
                        Plan an event <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                      </span>
                    </Link>
                    <Link to="/providers">
                      <span className="inline-flex h-11 items-center rounded-full bg-white/90 backdrop-blur-md border border-white px-7 text-xs font-bold uppercase tracking-wider text-slate-900 shadow-sm hover:bg-white hover:scale-105 active:scale-95 transition">
                        Browse Pros
                      </span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <Reveal className="mt-12 sm:mt-16">
            <div className="relative aspect-[4/3] max-h-[78vh] w-full overflow-hidden rounded-[1.5rem] bg-slate-200 sm:aspect-[16/9] sm:rounded-[2rem]">
              <Parallax speed={0.06}>
                <img src={IMG.heroMain} alt="A couple celebrating under confetti" decoding="async" className="h-full w-full object-cover object-[50%_20%]" />
              </Parallax>
              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-3 sm:bottom-8 sm:left-8 sm:right-8">
                <span className="eyebrow rounded-full bg-white/85 px-4 py-2 font-semibold text-slate-900">Weddings · Birthdays · Corporate</span>
                <span className="animate-float rounded-2xl bg-white/95 px-5 py-3 text-slate-900 shadow-xl">
                  <span className="eyebrow block text-slate-500">Proposal received</span>
                  <span className="font-display text-xl font-medium">₹38,000 · Candid + album</span>
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Ticker */}
      <div className="border-y border-slate-200 py-4 font-display text-lg font-medium uppercase tracking-tight text-slate-900 sm:text-2xl">
        <Marquee items={["Photography", "Catering", "Decoration", "Makeup", "DJ & Music", "Florists", "Planning", "Proposals", "Bookings"]} />
      </div>

      <ReelPanel />

      {/* Featured */}
      <section className="relative isolate overflow-hidden">
        <div className="mx-auto max-w-[1360px] px-4 py-20 sm:px-8 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <h2 className="font-display text-[clamp(2.6rem,6vw,5.5rem)] font-medium leading-none tracking-tight text-slate-950">Featured Providers</h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="max-w-xs text-[11px] font-semibold uppercase leading-relaxed tracking-wider text-slate-600 font-sans">
              A selection of the best-reviewed professionals, ready to quote on your next event.
            </p>
          </Reveal>
        </div>

        <div aria-hidden className="mt-10 flex justify-between px-1 font-sans text-lg leading-none text-slate-400">
          {[0, 1, 2, 3, 4].map((i) => <span key={i}>+</span>)}
        </div>
        <div ref={gridRef} className="lusion-grid mt-4 grid gap-x-8 gap-y-14 sm:grid-cols-2">
          {hasFeatured
            ? featured.slice(0, 4).map((p, i) => (
                <Reveal key={p._id} delay={(i % 2) * 160} className="w-full">
                  <ProviderCard provider={p} />
                </Reveal>
              ))
            : featuredLoading
              ? [0, 1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[16/10] rounded-[1.6rem] bg-slate-200/70" />
                    <div className="mt-4 h-3 w-1/3 rounded bg-slate-200/70" />
                    <div className="mt-3 h-6 w-2/3 rounded bg-slate-200/70" />
                  </div>
                ))
              : SHOWCASE.map((c, i) => (
                  <Reveal key={c.slug} delay={(i % 2) * 160} className="w-full">
                    <Link to={`/providers?category=${c.slug}`} className="group block">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.6rem] bg-slate-900 shadow-lg transition-all duration-700 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-indigo-500/15">
                        <img
                          src={sized(CATEGORY_IMAGES[c.slug], 1000)}
                          alt={c.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                        <span className="absolute bottom-3.5 left-3.5 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          ✓ Verified
                        </span>
                      </div>
                      <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">{c.name} • Hyderabad</p>
                      <div className="mt-1 flex items-baseline justify-between gap-4">
                        <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-brand-600">{c.title}</h3>
                        <span className="shrink-0 text-xs font-bold text-slate-900">from {c.price} <span className="ml-1.5 font-normal text-slate-500">★ 5.0</span></span>
                      </div>
                    </Link>
                  </Reveal>
                ))}
        </div>

        <div aria-hidden className="mt-6 flex justify-between px-1 font-sans text-lg leading-none text-slate-400">
          {[0, 1, 2, 3, 4].map((i) => <span key={i}>+</span>)}
        </div>

        <Reveal className="mt-16 flex justify-center">
          <Link to="/providers"><Pill dark>View all providers <span aria-hidden>→</span></Pill></Link>
        </Reveal>
        </div>
      </section>

      {/* Services list with hover preview */}
      <section className="bg-[#0c0c1d] text-white">
        <div className="mx-auto grid max-w-[1360px] gap-10 px-4 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow text-white/50">Services</p>
            <ul className="mt-6" onMouseLeave={() => setHovered(0)}>
              {SERVICES.map((s, i) => (
                <li key={s.slug}>
                  <Link
                    to={`/providers?category=${s.slug}`}
                    onMouseEnter={() => setHovered(i)}
                    onFocus={() => setHovered(i)}
                    className="group flex items-baseline justify-between gap-6 border-b border-white/15 py-4 transition hover:pl-4"
                  >
                    <span className={`font-display text-[clamp(1.8rem,3.5vw,3rem)] font-bold tracking-tight leading-none transition ${hovered === i ? "text-white" : "text-white/40"}`}>
                      {s.name}
                    </span>
                    <span className="hidden text-xs uppercase tracking-wider text-white/50 sm:block">{s.tag}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative hidden aspect-[4/5] overflow-hidden rounded-[2rem] lg:block">
            {SERVICES.map((s, i) => (
              <img
                key={s.slug}
                src={sized(CATEGORY_IMAGES[s.slug], 900)}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${hovered === i ? "scale-100 opacity-100" : "scale-110 opacity-0"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Two modes - Redesigned as clean modern cards */}
      <section className="mx-auto max-w-[1360px] px-4 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-2">How It Works</p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
              Find providers your way.
            </h2>
          </div>
          <p className="text-sm text-slate-500 max-w-sm">
            Choose direct discovery or let AI match you in seconds.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              badge: "EXPLORE",
              title: "Browse & Compare",
              text: "Search verified local professionals, filter by budget, inspect portfolios, and request quotes directly.",
              img: IMG.manual,
              to: "/providers",
              cta: "Browse Directory",
            },
            {
              badge: "AI POWERED",
              title: "Smart Event Matching",
              text: "Describe your event in natural language. We analyze your requirements and recommend top-matched providers.",
              img: IMG.ai,
              to: user ? "/ai/describe" : "/register",
              cta: "Try AI Match",
            },
          ].map((m, i) => (
            <Reveal key={m.title} delay={i * 100}>
              <Link
                to={m.to}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-brand-300"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-100 mb-6">
                  <img
                    src={m.img}
                    alt={m.title}
                    loading="lazy"
                    style={{ willChange: "transform" }}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-[11px] font-bold tracking-wider text-slate-900 shadow-sm">
                    {m.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
                    {m.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {m.text}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600">
                  <span>{m.cta}</span>
                  <span className="text-base transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Process - Streamlined */}
      <section className="border-t border-slate-200/80 bg-white/50">
        <div className="mx-auto max-w-[1360px] px-4 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">Simple Workflow</p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">From request to booking</h2>
            </div>
          </div>
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([n, title, text], i) => (
              <Reveal as="li" key={n} delay={i * 80} className="border-t-2 border-slate-900 pt-5">
                <span className="font-display text-3xl font-bold text-brand-600">{n}</span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600">{text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing statement with looping ribbon */}
      <section className="relative isolate overflow-hidden">
        <div className="mx-auto flex min-h-[70vh] max-w-[1360px] flex-col justify-end px-4 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <h2 className="max-w-[16ch] font-display text-[clamp(2.6rem,6.5vw,6rem)] font-medium leading-[1.02] tracking-tight text-slate-950">
              Where Planning Becomes Effortless Celebration
            </h2>
          </Reveal>
          <Reveal delay={120} className="mt-8">
            <Link to="/providers"><Pill>See all providers <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-600" /></Pill></Link>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden">
        <img src={IMG.cta} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-slate-950/80 backdrop-blur-[2px]" />
        <div className="mx-auto max-w-[1360px] px-4 py-20 text-white sm:px-8 sm:py-28 text-center">
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-display text-3xl sm:text-5xl font-bold tracking-tight">
              Ready to plan your next event?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm sm:text-base text-slate-300">
              Post requirements in minutes and get custom quotes from top verified local pros.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={user ? "/choose-mode" : "/register"}>
              <span className="inline-flex h-11 items-center gap-2.5 rounded-full bg-white px-7 text-xs font-bold uppercase tracking-wider text-slate-900 transition hover:bg-slate-100 hover:scale-[1.02] shadow-lg">
                Get started →
              </span>
            </Link>
            {!user && (
              <Link to="/register?role=PROVIDER">
                <span className="inline-flex h-11 items-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-7 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white/20">
                  Join as Provider
                </span>
              </Link>
            )}
          </Reveal>
        </div>
      </section>
    </div>
  );
}
