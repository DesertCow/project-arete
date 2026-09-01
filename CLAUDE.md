# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Project Arete** — an AI coaching platform for multi-sport athletes. Claude generates training
guidance from the athlete's context files plus live COROS wearable data pulled through MCP, a
National Weather Service forecast, and the athlete's local date/time.

The app works end to end: auth, context files, streaming coach chat, COROS OAuth + live MCP data,
weather, dashboard, public demo, and production deployment. **Workout generation is not built** —
`GeneratedWorkout` is read by the dashboard but nothing ever writes to it.

## Commands

A root `package.json` exists for deployment only — Railway runs `npm install` (whose `postinstall`
installs both packages, generates the Prisma client, and builds the client) and then `npm start`
(`prisma migrate deploy` + the server). It declares no dependencies of its own; day-to-day work is
still per-package.

```bash
# repo root — deployment entry points, not for daily development
npm install          # installs server + client, generates Prisma client, builds client
npm start            # prisma migrate deploy, then boots the server
npm run build        # production client build only

# server (from server/)
npm run dev          # nodemon on src/index.js, port 3001
npm start            # plain node
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:seed      # 4 demo athletes + context files (idempotent)
npm run db:studio    # prisma studio

# client (from client/)
npm run dev          # dev-server.js: esbuild watch + static server on :3000
npm run build        # one-shot esbuild -> dist/
npm run clean        # rm -rf dist
```

No test runner is wired up. Verification so far has been ad-hoc Node scripts run against the live
database and APIs. When a runner is added, document the single-test invocation here.

## Architecture

Two packages. In development they run separately (API on 3001, client on 3000); in production one
Express process serves both.

- `server/` — Express API, CommonJS. `src/index.js` loads dotenv, validates env, builds the pino
  logger, creates the HTTP server, attaches the WebSocket server, and listens. `src/app.js` builds
  and exports the app without listening, so it stays importable.
- `client/` — React 18 SPA bundled by a hand-written `esbuild.config.js`. `npm run dev` runs
  `dev-server.js`, which watches and serves `dist/` on port 3000 with an SPA fallback (esbuild's own
  serve mode cannot rewrite unknown paths to `index.html`).

### API surface

```
GET  /api/health                          public, never rate-limited
     /api/demo/*                          public; own per-IP limiter, mounted BEFORE apiLimiter
     /api/auth/*                          register, login, logout, me
     /api/context/:userId[/:fileType]     read all/one, PUT the two editable types
     /api/coach/*                         message, checkin, history
     /api/settings/profile                PATCH sportProfile (merges, never replaces)
     /api/coros/*                         dashboard, status, connect, callback, disconnect
WS   /ws/coach?token=JWT                  streaming coach chat
```

Mount order in `app.js` matters: `/api/demo` sits **before** `app.use('/api', apiLimiter)` so the
demo's own cooldown governs it instead of the global limiter.

### The coaching pipeline

`coachService.loadEnvironment()` assembles everything the coach sees, from one user lookup:

1. **Context files** — `contextManager.loadContextForPrompt()` returns the five files formatted for
   the prompt plus the raw rows.
2. **Weather** — `weatherService` (NWS, keyless, two-step grid lookup, forecasts cached 1h).
3. **Date/time** — `utils/userTime.js` renders the athlete's local day/time via `Intl`, defaulting
   to `America/New_York`. Includes an ISO date so the model can do exact day math.
4. **Live COROS** — only when `corosAccessToken` is set and the user is not `DEMO`. Cached 15
   minutes per user.

`coachPrompt.buildCoachSystemPrompt(context, mode, weather, dateTime, liveCoros)` — every argument
after the first is optional, and omitting them must leave the prompt byte-identical to before that
feature existed.

**Every one of these is non-blocking.** A weather, timezone, or MCP failure logs a warning and the
coach still replies. Never let an enrichment step break a coaching turn.

The coach appends a `<context_update>` JSON block to each reply, which `coachService` parses, applies
to the context files, and strips. **It must never reach the client** — `handleCoachMessageStream`
holds back any trailing substring that could still grow into the opening tag, because the tag can
straddle two stream chunks.

### COROS integration

- `corosOAuth.js` — OAuth 2.0, public client + PKCE (S256), **dynamic client registration** (no
  client ID or secret in env). The cached `client_id` is keyed by callback URL, so changing
  `COROS_CALLBACK_URL` forces re-registration.
- `encryption.js` — AES-256-GCM. Tokens are encrypted before they reach the database, always.
- `corosMcp.js` — one MCP client per batch over **Streamable HTTP**, not SSE. A GET to
  `mcp.coros.com/mcp` returns **405**; the endpoint only accepts POST. Refreshes the token once on a
  401 and retries; if that fails it clears the connection rather than showing stale data.
- `corosTextParser.js` — **COROS MCP tools return human-readable prose, not JSON.** That text is
  itself JSON-encoded, so a naive `JSON.parse` yields a bare string and every field lookup silently
  misses. This module parses each report back into the structured shapes the dashboard expects.
- Tool arguments differ per tool: most take `days`, but `querySportRecords` and
  `queryTrainingSchedule` take `startDate`/`endDate` in `yyyyMMdd` and **silently return only the
  last 7 days** if given `days`.

Coaching consumes the raw report text (already ideal for an LLM); the dashboard consumes the parsed
structures. Both fall back to `data/hardcodedCorosData.js` when there is no connection, and demo
accounts always use it.

### Prisma lives outside the default location

The schema is at `server/src/prisma/schema.prisma`, not `server/prisma/`. `server/package.json`
carries a `"prisma": { "schema": "src/prisma/schema.prisma" }` block — without it every `prisma` CLI
command fails to find the schema. Keep that block if you move the file.

`User` owns four child tables: `ContextFile` (one row per `FileType` per user, enforced by
`@@unique([userId, fileType])`), `ChatMessage`, `GeneratedWorkout`, and `Session`. `Session` rows are
the token revocation list — logout deletes the row, which kills a JWT that is still inside its 24h
validity window.

### Production runs as one process

When `NODE_ENV=production`, `app.js` serves `client/dist` and falls back to `index.html` for any
non-`/api/`, non-`/ws/` path. The 404 handler is scoped to `/api` precisely so it cannot swallow
client-side routes, and `trust proxy` is enabled so per-IP rate limiting sees real client addresses.

`npm run build` alone does **not** set `NODE_ENV`, so a local production bundle needs
`NODE_ENV=production npm run build`. The client dev watcher will overwrite `dist/` with a dev build
if it is left running.

`src/utils/validateEnv.js` runs before anything else in `index.js` and exits 1 on a missing or
placeholder-valued required secret, rather than failing later on the first request that needs it.

## Conventions

- React files use `.js`, never `.jsx`. esbuild is configured with `loader: { '.js': 'jsx' }` and the
  automatic JSX runtime, so no React import is needed.
- Server is CommonJS (`require`/`module.exports`). Client is ESM.
- Styling: CSS Modules for components, `client/src/styles/global.css` for the base layer. Dark theme
  (`#0a0a0a`). No Tailwind, no styled-components.
- Error responses always take the shape `{ error: { code, message, details? } }`. On the client every
  catch goes through `utils/apiError.js` so wording stays consistent.
- Demo accounts are frozen: they cannot log in, cannot connect COROS, their context files are
  read-only (against admins too), and their chat is never persisted. Keep it that way.
- Build tooling is esbuild only — no Vite, no CRA.
- Do not add dependencies beyond those already in the two `package.json` files without being asked.

## Known cruft

- **`ANTHROPIC_MODEL` has a broken fallback.** `services/ai.js` falls back to
  `claude-sonnet-4-20250514`, which is retired and returns 404 — an unset value breaks every coach
  call. `validateEnv` warns about it in production. Fixing the fallback to a current model id is a
  one-line change nobody has made yet.
- `server/src/constants/` (`sportTypes.js`, `lapColumnMap.js`, `cacheTTL.js`) is referenced by
  **zero** files. These were written in Phase 1 against an assumed COROS response shape; the real
  integration parses prose in `corosTextParser.js`, and chart colours live in
  `client/src/utils/chartColors.js`. `lapColumnMap.js` describes Chinese CSV headers the MCP never
  returns.
- `server/src/{controllers,config,mcp}/` and `client/src/{services,contexts}/` are still empty
  `.gitkeep` directories; MCP code lives in `server/src/services/`.
- Stale `.gitkeep` files remain in directories that now hold real code.
- In-memory caches (weather grids, coaching data, dashboard data, OAuth state, demo rate limits) are
  unbounded `Map`s scoped to one process. Fine at current scale; they will not survive multiple
  Railway instances.
