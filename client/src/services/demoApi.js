/**
 * Demo mode: an axios adapter that answers API calls from in-browser sample data.
 * Enabled with VITE_DEMO=true so the UI can be shown without a backend.
 * State is kept in localStorage; "Reset demo" (or clearing site data) restores it.
 */
import { AxiosError } from "axios";

const KEY = "dc_demo_db_v1";
const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10) + "T00:00:00.000Z";
let seq = 1000;
const uid = () => `d${(++seq).toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const CATS = [
  ["photography", "Photography", "1452587925148-ce544e77e70d"],
  ["catering", "Catering", "1555244162-803834f70033"],
  ["decoration", "Decoration", "1464366400600-7168b8af9bc3"],
  ["makeup", "Makeup", "1487412947147-5cebf100ffc2"],
  ["dj", "DJ", "1516450360452-9312f5e86fc7"],
  ["florist", "Florist", "1529636798458-92182e662485"],
].map(([slug, name, image]) => ({ _id: `cat-${slug}`, slug, name, active: true, image: img(image), description: "" }));

const P = (n, name, biz, cats, loc, areas, price, skills, yrs, verified, desc, cover, gallery, rating, count) => ({
  _id: `pro-${n}`, user: { _id: `u-${n}`, name }, businessName: biz, categories: cats.map((c) => CATS.find((x) => x.slug === c)),
  description: desc, location: loc, serviceAreas: areas, startingPrice: price, skills, experienceYears: yrs, verified,
  coverImage: img(cover), portfolio: gallery.map(img), ratingAverage: rating, ratingCount: count,
  availability: { workingDays: [0, 1, 2, 3, 4, 5, 6], blockedDates: [] },
});

const PROVIDERS = [
  P(1, "Arjun Reddy", "Frame & Light Studios", ["photography"], "Hyderabad", ["Hyderabad", "Secunderabad", "Warangal"], 30000, ["Candid photography", "Traditional photography", "Drone shots", "Wedding albums"], 8, true, "Award-winning wedding photographers capturing candid and traditional moments, from the first look to the last dance.", "1606216794074-735e91aa2c92", ["1606216794074-735e91aa2c92", "1519741497674-611481863552", "1465495976277-4387d4b0b4c6", "1544078751-58fee2d8a03b", "1527529482837-4698179dc6ce", "1583939003579-730e3918a45a"], 4.7, 3),
  P(2, "Meera Iyer", "Moments by Meera", ["photography"], "Hyderabad", ["Hyderabad"], 55000, ["Cinematic photography", "Pre-wedding shoots", "Candid photography"], 5, true, "Cinematic storytelling for weddings and pre-wedding shoots, edited with a soft, timeless palette.", "1478146896981-b80fe463b330", ["1478146896981-b80fe463b330", "1583939003579-730e3918a45a", "1544078751-58fee2d8a03b", "1452587925148-ce544e77e70d"], 4.5, 2),
  P(3, "Karthik Rao", "Click Craft", ["photography"], "Bengaluru", ["Bengaluru", "Mysuru"], 25000, ["Traditional photography", "Portraits"], 3, false, "Affordable traditional photography and video coverage across Karnataka.", "1558618666-fcd25c85cd64", ["1558618666-fcd25c85cd64", "1452587925148-ce544e77e70d", "1519741497674-611481863552"], 0, 0),
  P(4, "Lakshmi Foods", "Lakshmi Royal Caterers", ["catering"], "Hyderabad", ["Hyderabad", "Secunderabad"], 450, ["South Indian buffet", "Live counters", "Vegetarian menus", "Biryani"], 12, true, "Traditional Andhra and Hyderabadi feasts for 100 to 2000 guests, cooked fresh on site.", "1555244162-803834f70033", ["1555244162-803834f70033", "1414235077428-338989a2e8c0", "1493770348161-369560ae357d", "1504674900247-0877df9cc836", "1555939594-58d7cb561ad1", "1540189549336-e6e99c3679fe"], 4.5, 4),
  P(5, "Imran Sheikh", "Saffron Table Catering", ["catering"], "Hyderabad", ["Hyderabad"], 650, ["Multi-cuisine buffet", "Live grill", "Desserts", "Plated service"], 9, true, "Multi-cuisine catering with live grills and a dessert studio, designed for weddings and corporate events.", "1414235077428-338989a2e8c0", ["1414235077428-338989a2e8c0", "1565299624946-b28f40a0ae38", "1567620905732-2d1ec7ab7445", "1540189549336-e6e99c3679fe"], 4.5, 2),
  P(6, "Sana Khan", "Glow by Sana", ["makeup"], "Hyderabad", ["Hyderabad"], 15000, ["Bridal makeup", "HD makeup", "Hair styling", "Airbrush"], 6, true, "Bridal makeup artist specialising in HD and airbrush looks that last through the longest ceremonies.", "1487412947147-5cebf100ffc2", ["1487412947147-5cebf100ffc2", "1522335789203-aabd1fc54bc9", "1596462502278-27bfdc403348"], 5, 1),
  P(7, "Rohit Menon", "Bloom & Petal Decor", ["decoration", "florist"], "Hyderabad", ["Hyderabad", "Vijayawada"], 40000, ["Mandap decoration", "Floral stage", "Theme decor", "Garlands"], 7, false, "Floral stage and mandap decoration that turns venues into storybook settings.", "1464366400600-7168b8af9bc3", ["1464366400600-7168b8af9bc3", "1519225421980-715cb0215aed", "1523438885200-e635ba2c371e", "1469371670807-013ccf25f16a", "1522673607200-164d1b6ce486"], 4, 1),
  P(8, "Neha Kapoor", "Petal Poetry Florals", ["florist", "decoration"], "Hyderabad", ["Hyderabad", "Secunderabad"], 12000, ["Bridal bouquets", "Table centrepieces", "Floral arches", "Garlands"], 4, true, "Seasonal, locally sourced flowers arranged into bouquets, centrepieces and ceremony arches.", "1529636798458-92182e662485", ["1529636798458-92182e662485", "1457089328109-e5d9bd499191", "1561181286-d3fee7d55364", "1490750967868-88aa4486c946"], 5, 2),
  P(9, "Vikram Sethi", "Pulse Live DJ & Sound", ["dj"], "Hyderabad", ["Hyderabad", "Secunderabad", "Vijayawada"], 20000, ["Wedding DJ", "Sangeet nights", "Live sound", "LED lighting"], 10, true, "Wedding and sangeet DJ with full sound and lighting rigs. We read the room, you enjoy the party.", "1516450360452-9312f5e86fc7", ["1516450360452-9312f5e86fc7", "1514525253161-7a46d19cd819", "1549451371-64aa98a6f660", "1429962714451-bb934ecdc4ec"], 4.7, 3),
];

const REVIEW_TEXT = ["Fantastic work, everything was handled beautifully.", "Very professional and on time.", "Great value for money.", "Would hire again without a second thought."];

function seed() {
  const users = [
    { _id: "u-cust", name: "Priya Sharma", email: "customer@demo.com", role: "CUSTOMER", password: "Password123!", isActive: true, createdAt: day(-40) },
    { _id: "u-admin", name: "Platform Admin", email: "admin@demo.com", role: "ADMIN", password: "Password123!", isActive: true, createdAt: day(-90) },
    ...PROVIDERS.map((p) => ({ _id: p.user._id, name: p.user.name, email: `${p.user.name.split(" ")[0].toLowerCase()}@demo.com`, role: "PROVIDER", password: "Password123!", isActive: true, createdAt: day(-60) })),
  ];
  const photo = CATS.find((c) => c.slug === "photography");
  const requests = [
    {
      _id: "req-1", customer: { _id: "u-cust", name: "Priya Sharma" }, title: "Wedding · Photography", eventType: "Wedding", location: "Hyderabad",
      eventDate: day(60), duration: 8, guestCount: 250, budgetMin: 0, budgetMax: 50000, description: "Candid and traditional coverage for a two-day wedding.",
      services: [{ category: photo, requirements: ["Candid photography", "Traditional photography"] }], status: "OPEN", mode: "AI", invitedProviders: [], createdAt: day(-2),
    },
  ];
  const proposals = [
    { _id: "prop-1", request: "req-1", provider: "u-1", providerProfile: "pro-1", proposedPrice: 38000, includedServices: ["8 hours coverage", "2 photographers", "Edited album (60 pages)"], exclusions: ["Travel outside Hyderabad"], message: "We would love to cover your wedding. Happy to do a pre-event consultation.", status: "PENDING", createdAt: day(-1) },
    { _id: "prop-2", request: "req-1", provider: "u-2", providerProfile: "pro-2", proposedPrice: 47000, includedServices: ["10 hours coverage", "Cinematic highlight film", "Drone shots", "Edited album (80 pages)"], exclusions: [], message: "A cinematic approach with a highlight film delivered in 3 weeks.", status: "PENDING", createdAt: day(-1) },
  ];
  const reviews = {};
  PROVIDERS.forEach((p) => {
    reviews[p._id] = Array.from({ length: p.ratingCount }, (_, i) => ({
      _id: uid(), rating: p.ratingAverage >= 5 ? 5 : i % 3 === 2 ? Math.max(3, Math.floor(p.ratingAverage)) : Math.ceil(p.ratingAverage),
      comment: REVIEW_TEXT[i % 4], customer: { name: ["Ananya R.", "Rahul M.", "Divya K.", "Sandeep P."][i % 4] }, createdAt: day(-30 * (i + 1)),
    }));
  });
  return { users, providers: PROVIDERS, requests, proposals, bookings: [], reviews };
}

let db;
function load() {
  if (db) return db;
  try {
    db = JSON.parse(localStorage.getItem(KEY));
  } catch { /* fall through */ }
  if (!db) db = seed();
  return db;
}
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage unavailable */ }
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (m) => new HttpError(400, m);
const notFound = (m = "Not found") => new HttpError(404, m);
const forbidden = (m = "You do not have permission to do that") => new HttpError(403, m);

// ---- helpers ------------------------------------------------------------------
const publicUser = ({ password, ...u }) => u;
const profileOf = (userId) => load().providers.find((p) => p.user._id === userId);
const catOf = (id) => CATS.find((c) => c._id === id);
const norm = (s) => String(s || "").toLowerCase();
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

function currentUser(config) {
  const token = (config.headers?.Authorization || config.headers?.get?.("Authorization") || "").replace("Bearer ", "");
  const user = load().users.find((u) => token === `demo-${u._id}`);
  if (!user) throw new HttpError(401, "Authentication required");
  return user;
}
const need = (u, ...roles) => { if (!roles.includes(u.role)) throw forbidden(); };

function proposalView(p) {
  const prof = load().providers.find((x) => x._id === p.providerProfile);
  return { ...p, providerProfile: prof && { _id: prof._id, businessName: prof.businessName, ratingAverage: prof.ratingAverage, ratingCount: prof.ratingCount, verified: prof.verified, location: prof.location, startingPrice: prof.startingPrice } };
}
function bookingView(b) {
  const d = load();
  const req = d.requests.find((r) => r._id === b.request);
  const prof = d.providers.find((p) => p._id === b.providerProfile);
  const cust = d.users.find((u) => u._id === b.customer);
  return { ...b, request: req, providerProfile: prof && { _id: prof._id, businessName: prof.businessName, location: prof.location }, customer: { _id: cust._id, name: cust.name }, reviewed: Object.values(d.reviews).flat().some((r) => r.booking === b._id) };
}

// ---- matching + parsing (simplified client-side ports of the server logic) -----
const STOP = new Set(["and", "the", "for", "with", "need", "photography", "photographer", "catering", "service", "event"]);
const toks = (s) => norm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOP.has(t));

function evaluate(p, req) {
  const reasons = [];
  const catIds = req.services.map((s) => s.category._id);
  if (!p.categories.some((c) => catIds.includes(c._id))) reasons.push("Does not offer the requested service");
  const loc = norm(req.location);
  if (loc && ![p.location, ...p.serviceAreas].some((a) => norm(a).includes(loc) || loc.includes(norm(a)))) reasons.push(`Does not serve ${req.location}`);
  const booked = load().bookings.some((b) => b.provider === p.user._id && b.status !== "CANCELLED" && dayKey(b.eventDate) === dayKey(req.eventDate));
  if (booked) reasons.push("Already booked on the event date");
  if (req.budgetMax && p.startingPrice > req.budgetMax) reasons.push("Starting price is above the budget");

  const wanted = req.services.flatMap((s) => s.requirements);
  const hay = new Set(toks([p.businessName, p.description, ...p.skills].join(" ")));
  const matched = [], missing = [];
  let skills = 100;
  if (wanted.length) {
    let t = 0;
    wanted.forEach((w) => {
      const wt = toks(w);
      const f = wt.length ? wt.filter((x) => [...hay].some((h) => h.startsWith(x) || x.startsWith(h))).length / wt.length : 1;
      t += f;
      (f >= 0.5 ? matched : missing).push(w);
    });
    skills = (t / wanted.length) * 100;
  }
  const ratio = req.budgetMax ? p.startingPrice / req.budgetMax : 0;
  const budget = !req.budgetMax ? 100 : ratio > 1 ? 0 : ratio <= 0.8 ? 100 : 100 - ((ratio - 0.8) / 0.2) * 20;
  const exp = (p.ratingCount ? (p.ratingAverage / 5) * 100 : 50) * 0.7 + (Math.min(p.experienceYears, 10) / 10) * 100 * 0.3;
  const breakdown = { skills, location: reasons.some((r) => r.startsWith("Does not serve")) ? 0 : 100, availability: booked ? 0 : 100, budget, experience: exp };
  const score = 0.3 * breakdown.skills + 0.2 * breakdown.location + 0.2 * breakdown.availability + 0.2 * breakdown.budget + 0.1 * breakdown.experience;
  const parts = [];
  if (matched.length) parts.push(`Covers ${matched.join(", ")}`);
  if (missing.length) parts.push(`no clear match for ${missing.join(", ")}`);
  if (breakdown.location === 100 && req.location) parts.push(`serves ${req.location}`);
  parts.push("available on your date");
  if (p.startingPrice) parts.push(`starts at ₹${p.startingPrice.toLocaleString("en-IN")}${req.budgetMax ? ` (budget ₹${req.budgetMax.toLocaleString("en-IN")})` : ""}`);
  parts.push(p.ratingCount ? `rated ${p.ratingAverage.toFixed(1)}/5 from ${p.ratingCount} review${p.ratingCount > 1 ? "s" : ""}` : "no reviews yet");
  if (p.verified) parts.push("verified by DemandConnect");
  const text = parts.join("; ");
  return { eligible: reasons.length === 0, reasons, score: Math.round(score * 10) / 10, breakdown, explanation: text[0].toUpperCase() + text.slice(1) + "." };
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const FILLER = new Set(["need", "want", "for", "and", "the", "a", "an", "my", "our", "book", "hire", "find", "looking", "with", "some", "good", "best", "any", "i", "also", "please", "to"]);
const EVENTS = [["wedding", "Wedding"], ["engagement", "Engagement"], ["birthday", "Birthday"], ["anniversary", "Anniversary"], ["corporate", "Corporate event"], ["reception", "Reception"], ["party", "Party"]];
const HINTS = { photography: ["photographer", "photography", "photo", "candid"], catering: ["catering", "caterer", "food", "buffet"], decoration: ["decor", "decoration", "stage", "mandap"], makeup: ["makeup", "make-up", "mehendi"], dj: ["dj", "music", "sound"], florist: ["flower", "florist", "floral", "garland"] };

function parseText(text) {
  const lower = text.toLowerCase().replace(/,(?=\d)/g, "");
  const eventType = EVENTS.find(([k]) => lower.includes(k))?.[1] || "";
  const places = [...new Set(load().providers.flatMap((p) => [p.location, ...p.serviceAreas]))];
  const location = places.sort((a, b) => b.length - a.length).find((l) => lower.includes(l.toLowerCase())) || "";
  const guests = lower.match(/(\d{1,5})\s*(?:guests|people|pax)/);
  const amts = [];
  const re = /(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*(k|lakh|lakhs|lac)?|(\d+(?:\.\d+)?)\s*(k|lakh|lakhs|lac)\b/g;
  let m;
  while ((m = re.exec(lower))) amts.push(Math.round(parseFloat(m[1] ?? m[3]) * ((m[2] ?? m[4]) === "k" ? 1e3 : (m[2] ?? m[4]) ? 1e5 : 1)));
  let eventDate = "";
  const iso = lower.match(/\b\d{4}-\d{2}-\d{2}\b/);
  const dm = lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join("|")})(?:\\s*,?\\s*(\\d{4}))?`));
  if (iso) eventDate = iso[0];
  else if (dm) {
    const y = dm[3] ? Number(dm[3]) : new Date().getFullYear();
    const d = new Date(Date.UTC(y, MONTHS.indexOf(dm[2]), Number(dm[1])));
    if (!dm[3] && d < new Date()) d.setUTCFullYear(y + 1);
    eventDate = d.toISOString().slice(0, 10);
  }
  const services = [];
  CATS.forEach((c) => {
    const hints = new Set([c.name.toLowerCase(), ...(HINTS[c.slug] || [])]);
    if (![...hints].some((h) => new RegExp(`\\b${h}`).test(lower))) return;
    const reqs = new Set();
    hints.forEach((h) => {
      const r = new RegExp(`\\b((?:[a-z]+(?:\\s*,\\s*|\\s+and\\s+))*[a-z]+)\\s+${h}\\b`, "g");
      let x;
      while ((x = r.exec(lower))) x[1].split(/\s*,\s*|\s+and\s+/).forEach((w) => {
        if (w && !FILLER.has(w) && !EVENTS.some(([k]) => k === w)) reqs.add(`${w[0].toUpperCase()}${w.slice(1)} ${h}`);
      });
    });
    services.push({ category: c._id, categoryName: c.name, requirements: [...reqs].slice(0, 6) });
  });
  return {
    eventType, location, eventDate, guestCount: guests ? Number(guests[1]) : 0, duration: 0,
    budgetMin: amts.length > 1 ? Math.min(...amts) : 0, budgetMax: amts.length ? Math.max(...amts) : 0,
    services, description: text.trim(), source: "rules", warning: null,
  };
}

// ---- router ---------------------------------------------------------------------
function route(method, path, body, params, config) {
  const d = load();
  let m;

  // Auth
  if (method === "post" && path === "/auth/register") {
    if (d.users.some((u) => u.email === body.email.toLowerCase())) throw new HttpError(409, "An account with this email already exists");
    const user = { _id: uid(), name: body.name, email: body.email.toLowerCase(), role: body.role === "PROVIDER" ? "PROVIDER" : "CUSTOMER", password: body.password, isActive: true, createdAt: new Date().toISOString() };
    d.users.push(user);
    return { data: { user: publicUser(user), token: `demo-${user._id}` }, status: 201 };
  }
  if (method === "post" && path === "/auth/login") {
    const user = d.users.find((u) => u.email === body.email.toLowerCase() && u.password === body.password);
    if (!user) throw new HttpError(401, "Invalid email or password");
    return { data: { user: publicUser(user), token: `demo-${user._id}` } };
  }
  if (path === "/auth/me") {
    const u = currentUser(config);
    return { data: { user: publicUser(u), hasProfile: !!profileOf(u._id) } };
  }
  if (path === "/auth/logout") return { data: { message: "Logged out" } };

  if (path === "/categories") return { data: CATS };

  // Providers
  if (method === "get" && path === "/providers") {
    let list = d.providers.filter((p) => d.users.find((u) => u._id === p.user._id)?.isActive !== false);
    const { q, category, location, minPrice, maxPrice, minRating, sort = "rating", page = 1, limit = 12 } = params;
    if (category) list = list.filter((p) => p.categories.some((c) => c.slug === category));
    if (location) list = list.filter((p) => [p.location, ...p.serviceAreas].some((a) => norm(a).includes(norm(location))));
    if (q) list = list.filter((p) => norm([p.businessName, p.description, ...p.skills].join(" ")).includes(norm(q)));
    if (minPrice) list = list.filter((p) => p.startingPrice >= +minPrice);
    if (maxPrice) list = list.filter((p) => p.startingPrice <= +maxPrice);
    if (minRating) list = list.filter((p) => p.ratingAverage >= +minRating);
    const by = { rating: (a, b) => b.ratingAverage - a.ratingAverage || b.ratingCount - a.ratingCount, price_asc: (a, b) => a.startingPrice - b.startingPrice, price_desc: (a, b) => b.startingPrice - a.startingPrice, newest: () => 0 };
    list = [...list].sort(by[sort] || by.rating);
    const total = list.length;
    const pg = Number(page), lm = Number(limit);
    return { data: list.slice((pg - 1) * lm, pg * lm), pagination: { page: pg, limit: lm, total, pages: Math.ceil(total / lm) } };
  }
  if (method === "get" && path === "/providers/me") {
    const p = profileOf(currentUser(config)._id);
    if (!p) throw notFound("You have not created a provider profile yet");
    return { data: p };
  }
  if ((method === "post" || method === "patch") && path === "/providers/profile") {
    const u = currentUser(config);
    need(u, "PROVIDER");
    let p = profileOf(u._id);
    if (method === "post" && p) throw new HttpError(409, "You already have a provider profile");
    const fields = { ...body, categories: (body.categories || []).map(catOf).filter(Boolean) };
    if (!p) {
      p = { _id: uid(), user: { _id: u._id, name: u.name }, ratingAverage: 0, ratingCount: 0, verified: false, portfolio: [], skills: [], serviceAreas: [], ...fields };
      d.providers.push(p);
    } else Object.assign(p, fields, { availability: { ...p.availability, ...body.availability } });
    p.availability = { workingDays: p.availability?.workingDays ?? [0, 1, 2, 3, 4, 5, 6], blockedDates: p.availability?.blockedDates ?? [] };
    return { data: p, status: method === "post" ? 201 : 200 };
  }
  if ((m = path.match(/^\/providers\/([^/]+)\/reviews$/))) return { data: d.reviews[m[1]] || [] };
  if ((m = path.match(/^\/providers\/([^/]+)$/)) && method === "get") {
    const p = d.providers.find((x) => x._id === m[1]);
    if (!p) throw notFound("Provider not found");
    return { data: p };
  }

  // Requests
  if (method === "post" && path === "/requests") {
    const u = currentUser(config);
    need(u, "CUSTOMER");
    if (new Date(body.eventDate) < new Date(dayKey(new Date()))) throw bad("Event date cannot be in the past");
    const r = {
      ...body, _id: uid(), customer: { _id: u._id, name: u.name }, status: "OPEN", createdAt: new Date().toISOString(),
      eventDate: new Date(body.eventDate).toISOString(),
      services: body.services.map((s) => ({ category: catOf(s.category), requirements: s.requirements || [] })),
    };
    d.requests.unshift(r);
    return { data: r, status: 201 };
  }
  if (path === "/requests/mine") {
    const u = currentUser(config);
    return { data: d.requests.filter((r) => r.customer._id === u._id).map((r) => ({ ...r, pendingProposals: d.proposals.filter((p) => p.request === r._id && p.status === "PENDING").length })) };
  }
  if (path === "/requests/open") {
    const u = currentUser(config);
    const prof = profileOf(u._id);
    let list = d.requests.filter((r) => r.status === "OPEN");
    if (params.matching === "true") {
      if (!prof) throw bad("Create your provider profile to see matching requests");
      list = list.filter((r) => r.services.some((s) => prof.categories.some((c) => c._id === s.category._id)));
    }
    return { data: list.map((r) => ({ ...r, invited: !!prof && (r.invitedProviders || []).includes(prof._id), myProposalStatus: d.proposals.find((p) => p.request === r._id && p.provider === u._id)?.status || null })), pagination: { page: 1, limit: 20, total: list.length, pages: 1 } };
  }
  if ((m = path.match(/^\/requests\/([^/]+)\/proposals$/))) {
    return { data: d.proposals.filter((p) => p.request === m[1] && p.status !== "WITHDRAWN").sort((a, b) => a.proposedPrice - b.proposedPrice).map(proposalView) };
  }
  if ((m = path.match(/^\/requests\/([^/]+)\/invite$/))) {
    const r = d.requests.find((x) => x._id === m[1]);
    if (!r) throw notFound();
    r.invitedProviders = [...new Set([...(r.invitedProviders || []), body.providerId])];
    return { data: { message: "Provider invited" } };
  }
  if ((m = path.match(/^\/requests\/([^/]+)$/))) {
    const r = d.requests.find((x) => x._id === m[1]);
    if (!r) throw notFound("Request not found");
    if (method === "delete") {
      if (r.status !== "OPEN") throw new HttpError(409, "Only open requests can be cancelled. Cancel the booking instead.");
      r.status = "CANCELLED";
      d.proposals.filter((p) => p.request === r._id && p.status === "PENDING").forEach((p) => (p.status = "REJECTED"));
    }
    return { data: r };
  }

  // Proposals
  if (method === "post" && path === "/proposals") {
    const u = currentUser(config);
    need(u, "PROVIDER");
    const prof = profileOf(u._id);
    if (!prof) throw bad("Create your provider profile before sending proposals");
    const r = d.requests.find((x) => x._id === body.request);
    if (!r || r.status !== "OPEN") throw new HttpError(409, "This request is no longer open");
    const existing = d.proposals.find((p) => p.request === r._id && p.provider === u._id);
    if (existing && existing.status !== "WITHDRAWN") throw new HttpError(409, "You have already submitted a proposal for this request");
    const fields = { proposedPrice: body.proposedPrice, includedServices: body.includedServices || [], exclusions: body.exclusions || [], message: body.message || "", status: "PENDING" };
    if (existing) { Object.assign(existing, fields); return { data: existing }; }
    const p = { _id: uid(), request: r._id, provider: u._id, providerProfile: prof._id, ...fields, createdAt: new Date().toISOString() };
    d.proposals.push(p);
    return { data: p, status: 201 };
  }
  if (path === "/proposals/mine") {
    const u = currentUser(config);
    return { data: d.proposals.filter((p) => p.provider === u._id).map((p) => ({ ...p, request: d.requests.find((r) => r._id === p.request) })) };
  }
  if ((m = path.match(/^\/proposals\/([^/]+)\/(accept|reject|withdraw)$/))) {
    const u = currentUser(config);
    const p = d.proposals.find((x) => x._id === m[1]);
    if (!p) throw notFound("Proposal not found");
    if (m[2] === "withdraw") {
      if (p.provider !== u._id || p.status !== "PENDING") throw new HttpError(409, "Only your pending proposals can be withdrawn");
      p.status = "WITHDRAWN";
      return { data: p };
    }
    need(u, "CUSTOMER");
    if (p.status !== "PENDING") throw new HttpError(409, `Proposal is already ${p.status.toLowerCase()}`);
    if (m[2] === "reject") { p.status = "REJECTED"; return { data: p }; }
    const r = d.requests.find((x) => x._id === p.request);
    if (r.status !== "OPEN") throw new HttpError(409, "This request is no longer open");
    p.status = "ACCEPTED";
    r.status = "BOOKED";
    d.proposals.filter((x) => x.request === r._id && x._id !== p._id && x.status === "PENDING").forEach((x) => (x.status = "REJECTED"));
    const b = { _id: uid(), request: r._id, proposal: p._id, customer: r.customer._id, provider: p.provider, providerProfile: p.providerProfile, agreedPrice: p.proposedPrice, eventDate: r.eventDate, status: "CONFIRMED", createdAt: new Date().toISOString() };
    d.bookings.push(b);
    return { data: b, status: 201 };
  }

  // Bookings & reviews
  if (path === "/bookings/mine") {
    const u = currentUser(config);
    const f = u.role === "PROVIDER" ? "provider" : "customer";
    return { data: d.bookings.filter((b) => b[f] === u._id).map(bookingView).reverse() };
  }
  if ((m = path.match(/^\/bookings\/([^/]+)\/status$/))) {
    const u = currentUser(config);
    const b = d.bookings.find((x) => x._id === m[1]);
    if (!b) throw notFound("Booking not found");
    const next = { CONFIRMED: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"] }[b.status] || [];
    if (["IN_PROGRESS", "COMPLETED"].includes(body.status) && u.role !== "PROVIDER") throw forbidden("Only a provider can set a booking to " + body.status);
    if (!next.includes(body.status)) throw new HttpError(409, `A ${b.status.toLowerCase()} booking cannot become ${body.status}`);
    b.status = body.status;
    const r = d.requests.find((x) => x._id === b.request);
    if (body.status === "COMPLETED") { b.completedAt = new Date().toISOString(); r.status = "COMPLETED"; }
    if (body.status === "CANCELLED") { r.status = "OPEN"; const pr = d.proposals.find((x) => x._id === b.proposal); if (pr) pr.status = "WITHDRAWN"; }
    return { data: b };
  }
  if (method === "post" && path === "/reviews") {
    const u = currentUser(config);
    const b = d.bookings.find((x) => x._id === body.booking && x.customer === u._id);
    if (!b) throw notFound("Booking not found");
    if (b.status !== "COMPLETED") throw new HttpError(409, "You can only review a completed booking");
    const list = (d.reviews[b.providerProfile] = d.reviews[b.providerProfile] || []);
    if (list.some((r) => r.booking === b._id)) throw new HttpError(409, "You have already reviewed this booking");
    list.unshift({ _id: uid(), booking: b._id, rating: body.rating, comment: body.comment || "", customer: { name: u.name }, createdAt: new Date().toISOString() });
    const prof = d.providers.find((p) => p._id === b.providerProfile);
    prof.ratingCount = list.length;
    prof.ratingAverage = Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10;
    return { data: list[0], status: 201 };
  }

  // AI
  if (path === "/ai/parse-requirement") return { data: parseText(body.text) };
  if (path === "/ai/recommendations") {
    const r = d.requests.find((x) => x._id === body.requestId);
    if (!r) throw notFound("Request not found");
    const rows = d.providers.map((p) => ({ p, e: evaluate(p, r) }));
    const shape = ({ p, e }) => ({ provider: { _id: p._id, businessName: p.businessName, location: p.location, categories: p.categories, startingPrice: p.startingPrice, ratingAverage: p.ratingAverage, ratingCount: p.ratingCount, verified: p.verified, skills: p.skills, coverImage: p.coverImage, portfolio: p.portfolio.slice(0, 1) }, score: e.score, breakdown: e.breakdown, explanation: e.explanation, reasons: e.reasons });
    const inCat = rows.filter(({ p }) => p.categories.some((c) => r.services.some((s) => s.category._id === c._id)));
    return { data: { matches: inCat.filter((x) => x.e.eligible).sort((a, b) => b.e.score - a.e.score).map(shape), excluded: inCat.filter((x) => !x.e.eligible).map(shape) } };
  }
  if (path === "/ai/compare-proposals") {
    const list = d.proposals.filter((p) => p.request === body.requestId && p.status === "PENDING").map(proposalView);
    if (!list.length) return { data: { count: 0, facts: null, summary: null } };
    const cheapest = [...list].sort((a, b) => a.proposedPrice - b.proposedPrice)[0];
    const top = [...list].sort((a, b) => b.providerProfile.ratingAverage - a.providerProfile.ratingAverage)[0];
    const incl = [...list].sort((a, b) => b.includedServices.length - a.includedServices.length)[0];
    return { data: { count: list.length, facts: { cheapest: cheapest._id, highestRated: top._id, mostInclusive: incl._id, overBudget: [] }, summary: `${cheapest.providerProfile.businessName} is the lowest price at ₹${cheapest.proposedPrice.toLocaleString("en-IN")}, while ${incl.providerProfile.businessName} includes the most (${incl.includedServices.length} items).` } };
  }

  // Admin
  if (path === "/admin/stats") {
    return { data: { users: d.users.length, providers: d.providers.length, unverifiedProviders: d.providers.filter((p) => !p.verified).length, requests: d.requests.length, openRequests: d.requests.filter((r) => r.status === "OPEN").length, proposals: d.proposals.length, bookings: d.bookings.length, bookedValue: d.bookings.reduce((s, b) => s + b.agreedPrice, 0) } };
  }
  if (path === "/admin/users" && method === "get") return { data: d.users.map(publicUser) };
  if ((m = path.match(/^\/admin\/users\/([^/]+)$/))) {
    const u = d.users.find((x) => x._id === m[1]);
    u.isActive = body.isActive;
    return { data: publicUser(u) };
  }
  if (path === "/admin/providers") return { data: d.providers.map((p) => ({ ...p, user: { ...p.user, email: d.users.find((u) => u._id === p.user._id)?.email } })) };
  if ((m = path.match(/^\/admin\/providers\/([^/]+)\/verify$/))) {
    const p = d.providers.find((x) => x._id === m[1]);
    p.verified = body.verified;
    return { data: p };
  }
  if (path === "/admin/categories" && method === "get") return { data: CATS };
  if (path === "/admin/categories" && method === "post") {
    const c = { _id: uid(), name: body.name, slug: body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: body.description || "", active: true, image: "" };
    CATS.push(c);
    return { data: c, status: 201 };
  }
  if ((m = path.match(/^\/admin\/categories\/([^/]+)$/))) {
    const c = CATS.find((x) => x._id === m[1]);
    Object.assign(c, body);
    return { data: c };
  }

  throw notFound(`Route not found: ${method.toUpperCase()} ${path}`);
}

/** axios adapter */
export default async function demoAdapter(config) {
  await new Promise((r) => setTimeout(r, 150)); // feel like a network
  const url = (config.url || "").split("?")[0].replace(/^\/api/, "");
  const method = (config.method || "get").toLowerCase();
  const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data || {};
  try {
    const out = route(method, url, body, config.params || {}, config);
    save();
    const payload = { success: true, data: out.data, ...(out.pagination ? { pagination: out.pagination } : {}) };
    return { data: JSON.parse(JSON.stringify(payload)), status: out.status || 200, statusText: "OK", headers: {}, config };
  } catch (err) {
    if (!(err instanceof HttpError)) throw err;
    const response = { data: { success: false, message: err.message }, status: err.status, statusText: "Error", headers: {}, config };
    throw new AxiosError(err.message, "ERR_BAD_REQUEST", config, null, response);
  }
}

export function resetDemo() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  db = null;
}
