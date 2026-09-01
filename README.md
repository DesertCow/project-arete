# Arete — AI Coaching for Athletes

Arete is an AI-powered coaching platform that connects to COROS wearable data via MCP (Model Context
Protocol) to deliver personalized training guidance for multi-sport athletes. The coach reads your
training history, goals, health profile, live watch metrics, local weather, and the current time in
your timezone before every reply. Built as a reference application demonstrating MCP integration
with Claude.

## What it does

- **Conversational coaching** — streaming chat over WebSocket, with a non-streaming REST fallback.
  The coach writes back to its own memory after every exchange.
- **Five context files per athlete** — `COACH_MEMORY`, `GOALS`, `TRAINING_PLAN`, `TRAINING_HISTORY`,
  `HEALTH_PROFILE`. Goals and health profile are user-editable; the other three are coach-managed.
- **Live COROS data** — connect a COROS account via OAuth and the dashboard and coach switch from
  sample data to your real recovery, sleep, HRV, training load, and activities.
- **Weather-aware advice** — a 3-day National Weather Service forecast for your saved location, which
  the coach interprets rather than recites ("Saturday is 110°F — move that one indoors").
- **Timezone-aware advice** — the coach knows what day and hour it is where you are, and counts down
  to dated races in your goals.
- **Dashboard** — recovery, fitness, resting HR and stress cards, plus training-load, load-ratio,
  HRV, sleep and RHR charts (recharts).
- **Life check-in** — a structured six-topic conversation the coach walks through one step at a time.
- **Public demo** — four seeded athletes with weeks of history, chattable without an account,
  rate-limited and ephemeral.

## Demo athletes

| Athlete | Sport | Location | Story |
| --- | --- | --- | --- |
| Maria Chen | Marathon | Portland, OR | Night-shift nurse training for her first marathon |
| James Hartley | Alpine climbing | Boulder, CO | Engineer preparing for The Diamond on Longs Peak |
| Sofia Reyes | Triathlon | Austin, TX | Former college swimmer, first Olympic-distance tri |
| Marcus Webb | Running | Nashville, TN | Coach rebuilding after an Achilles rupture |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, esbuild, CSS Modules, recharts |
| Backend | Node.js, Express, `ws` |
| Database | PostgreSQL, Prisma |
| AI | Claude API (`@anthropic-ai/sdk`) |
| Wearables | COROS MCP (`@modelcontextprotocol/sdk`, Streamable HTTP + OAuth 2.0 PKCE) |
| Weather | National Weather Service API (keyless) |
| Deployment | Railway (nixpacks) |

## Getting Started

```bash
git clone <repo-url> project-arete
cd project-arete

cp server/.env.example server/.env          # then fill in the values below
npm install                                 # installs both packages, generates Prisma client, builds client

cd server
npx prisma migrate dev                      # create the schema
npm run db:seed                             # 4 demo athletes + their context files
npm run dev                                 # API on :3001

cd ../client && npm run dev                 # client on :3000, LAN-accessible
```

Open <http://localhost:3000>. The demo at `/demo` works without an account.

### Required environment variables

The server refuses to start if any of these are missing or still hold a placeholder:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Claude API key |
| `COROS_TOKEN_ENCRYPTION_KEY` | Exactly 64 hex chars — `openssl rand -hex 32` |
| `COROS_CALLBACK_URL` | Required in production only |

Optional, with defaults: `PORT` (3001), `NODE_ENV` (development), `AI_PROVIDER` (claude),
`ALLOWED_EMAIL_DOMAIN` (coros.com), `CLIENT_URL`.
See [`server/.env.example`](server/.env.example) for the full list.

**Set `ANTHROPIC_MODEL` explicitly.** Its code fallback is a retired model id that returns 404, so
leaving it unset breaks every coach call. The server logs a warning about this at startup.

Registration is restricted to one email domain. Set `ALLOWED_EMAIL_DOMAIN=*` to open it up.

## Connecting a COROS account

Log in, go to **Settings → COROS Account → Connect COROS**. The login happens on COROS's own site;
Arete never sees the password. Tokens are AES-256-GCM encrypted before they touch the database.

Arete registers itself with COROS dynamically (public client + PKCE), so no client ID or secret is
needed — but the registration is tied to the callback URL, so set `COROS_CALLBACK_URL` to your real
domain before connecting in production.

Without a connection, the dashboard and coach fall back to a sample dataset. Demo athletes always
use sample data and can never connect.

## Deployment (Railway)

Railway runs `npm install` at the repo root (whose `postinstall` installs both packages, generates
the Prisma client, and builds the client), then `npm start` (`prisma migrate deploy`, then the
server). In production one Express process serves both the API and the built SPA on a single port.

Set the required variables above plus `CLIENT_URL` and `COROS_CALLBACK_URL` to your Railway domain.

## Project Status

Working end to end: auth, context files, coach chat (streaming + check-in), live COROS via MCP,
weather, dashboard, public demo, goals/health editors, and production deployment.

Not built: **workout generation** — the `GeneratedWorkout` table and its dashboard panel exist, but
nothing writes to them yet, so "Coach Workouts" is always empty. Pushing workouts back to COROS is
also unimplemented. There is no automated test suite; verification to date has been manual and
script-driven.

## License

Private / All Rights Reserved.

## Author

Clayton Skaggs
