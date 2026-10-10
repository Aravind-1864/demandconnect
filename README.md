# DemandConnect

A requirement-based marketplace for local event services. Customers post what their event needs, discover providers (manually or with AI assistance), compare priced proposals, and book the provider they choose.

| | |
|---|---|
| **Manual Mode** | Search, filter, browse profiles and request quotes yourself |
| **AI Mode** | Describe the event in plain language → review extracted fields → ranked, explained recommendations from real provider data |

**Stack:** React 19 + Vite + Tailwind CSS 4 · Node.js + Express 5 · MongoDB + Mongoose · JWT + bcrypt · Zod validation · optional Gemini / OpenAI

---

## Quick start

Requirements: Node.js 18+, a MongoDB database (local or [Atlas](https://www.mongodb.com/atlas)).

```bash
# 1. Install everything
npm run install:all

# 2. Configure the API
cp server/.env.example server/.env      # then edit MONGODB_URI and JWT_SECRET

# 3. (Optional) load demo data
npm run seed

# 4. Run API (:5000) and web app (:5173) together
npm run dev
```

Open http://localhost:5173. Demo accounts after seeding (password `Password123!`):

| Role | Email |
|---|---|
| Customer | `customer@demo.com` |
| Provider | `arjun@demo.com` (photography, Hyderabad), `lakshmi@demo.com` (catering) |
| Admin | `admin@demo.com` |

Health check: `GET http://localhost:5000/api/health`

### Environment variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | ≥ 16 chars. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CLIENT_URL` | Allowed browser origin(s), comma-separated |
| `AI_PROVIDER` | `gemini`, `openai` or `none` |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | Only for the provider you choose |

AI is **optional**. With `AI_PROVIDER=none` (or if the AI call fails) a deterministic rule-based parser extracts fields, so AI Mode always works. API keys never leave the server.

The server validates its environment on boot and refuses to start with a bad configuration.

---

## Architecture

```
DemandConnect/
├── client/                React SPA
│   └── src/
│       ├── components/    ui kit, Navbar, ProviderCard, RequestForm, ProtectedRoute …
│       ├── context/       AuthContext (session + role)
│       ├── layouts/       MainLayout, DashboardLayout
│       ├── pages/         manual/ ai/ customer/ provider/ admin/
│       ├── services/api.js  axios instance, auth + 401 handling
│       └── utils/         formatters, useFetch
└── server/                Express API
    ├── config/            env validation (Zod), DB connection
    ├── models/            User, ProviderProfile, Category, ServiceRequest, Proposal, Booking, Review, Message
    ├── validators/        Zod request schemas
    ├── middleware/        auth (JWT), roles, validation, error handling
    ├── controllers/       request handlers (thin)
    ├── services/          matchingService (pure scoring), aiService (LLM + fallback)
    ├── routes/            one router per resource
    ├── scripts/seed.js    demo data
    └── tests/             unit + end-to-end API tests
```

**Design decisions**

- **One app, two modes.** Manual and AI modes share accounts, providers, requests, proposals, bookings and reviews; `ServiceRequest.mode` records how it was created.
- **A provider is a `User` (role `PROVIDER`) plus one `ProviderProfile`.** Proposals/bookings/reviews store both ids for cheap ownership checks and rich display.
- **The AI never decides matches.** It interprets text and (optionally) summarizes proposals. Its output is validated with Zod, mapped onto real categories, and shown to the customer for confirmation. Ranking is a transparent weighted formula in `matchingService.js`.
- **Accepting a proposal is race-safe without transactions.** Conditional atomic updates (`PENDING→ACCEPTED`, `OPEN→BOOKED`), with rollback on failure and a partial unique index on `Booking.request` as the final guard. A test fires two concurrent accepts and asserts exactly one booking.
- **Prices are fixed at acceptance.** `agreedPrice` is copied from the proposal and no endpoint can change it.

### Matching score

```
score = 0.30·skills + 0.20·location + 0.20·availability + 0.20·budget + 0.10·experience/rating
```

Each factor is 0–100. Providers are **excluded** (listed separately with the reason) if they lack the category, don't serve the city, are unavailable on the date (blocked date, non-working weekday, or an existing booking), or start above the budget. Explanations are generated only from verified facts.

---

## API overview

All routes are prefixed `/api`. Responses: `{ success, data, pagination? }` or `{ success: false, message, errors? }`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` · `POST /auth/logout` |
| Providers | `GET /providers` (search/filter) · `GET /providers/:id` · `GET /providers/:id/reviews` · `GET /providers/me` · `POST/PATCH /providers/profile` · `GET /categories` |
| Requests | `POST /requests` · `GET /requests/mine` · `GET /requests/open` · `GET/PATCH/DELETE /requests/:id` · `POST /requests/:id/invite` · `GET /requests/:id/proposals` |
| Proposals | `POST /proposals` · `GET /proposals/mine` · `PATCH /proposals/:id/accept\|reject\|withdraw` |
| Bookings | `GET /bookings/mine` · `GET /bookings/:id` · `PATCH /bookings/:id/status` |
| Reviews | `POST /reviews` |
| AI | `POST /ai/parse-requirement` · `POST /ai/recommendations` · `POST /ai/compare-proposals` |
| Admin | `GET /admin/stats\|users\|providers\|categories` · `PATCH /admin/users/:id` · `PATCH /admin/providers/:id/verify` · `POST/PATCH /admin/categories` |

**Booking lifecycle:** `CONFIRMED → IN_PROGRESS → COMPLETED` (provider) · `CANCELLED` from `CONFIRMED`/`IN_PROGRESS` (either party; re-opens the request). Reviews: only the booking's customer, only after `COMPLETED`, once per booking.

---

## Security

- Passwords hashed with bcrypt (cost 12); hashes never serialized.
- JWT bearer auth; role middleware on every protected route; admin role cannot be self-assigned.
- Customers only see their own requests and proposals (non-owners get `404`, not `403`).
- Zod validation on every body/query/param; unknown fields stripped; ObjectIds checked.
- `helmet`, CORS allow-list, request size limit, rate limits on auth and AI endpoints.
- Login errors don't reveal whether an email exists.
- Secrets and AI keys live only in server environment variables.

## Testing

```bash
npm test
```

- `server/tests/matching.test.js` — scoring, eligibility and parser unit tests
- `server/tests/api.test.js` — full lifecycle against an in-memory MongoDB: auth, roles, profiles, search, requests, AI, proposals, concurrent accept, booking transitions, reviews, admin

The first run downloads an in-memory MongoDB binary.

## Deployment (Render)

1. **MongoDB Atlas:** create a cluster, a database user, and allow Render's IPs (or `0.0.0.0/0` for a demo). Copy the connection string.
2. **API (Web Service):** root `server`, build `npm install`, start `npm start`. Env: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL=<your static site URL>`, plus AI vars if used.
3. **Web (Static Site):** root `client`, build `npm install && npm run build`, publish `dist`. Env: `VITE_API_URL=https://<your-api>.onrender.com/api`. Add a rewrite rule `/*` → `/index.html` for client-side routing.
4. Seed demo data once from your machine (`MONGODB_URI=<atlas> npm run seed`) — the seed script refuses to run when `NODE_ENV=production`.

## Roadmap

Real-time chat (`Message` model is in place), Cloudinary image uploads for portfolios, email/in-app notifications, booking-date calendar view for providers.
