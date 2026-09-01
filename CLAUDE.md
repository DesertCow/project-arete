# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Project Arete** — an AI coaching platform for multi-sport athletes. Claude generates training
guidance from live COROS wearable data pulled through MCP (Model Context Protocol). A 16-phase build
plan; Phase 1 (scaffold) is complete, so most directories are still `.gitkeep` placeholders.

## Commands

A root `package.json` exists for deployment only — Railway runs `npm install`
(whose `postinstall` installs both packages, generates the Prisma client, and
builds the client) and then `npm start` (`prisma migrate deploy` + the server).
It declares no dependencies of its own; day-to-day work is still per-package.

```bash
# repo root — deployment entry points, not for daily development
npm install          # installs server + client, generates Prisma client, builds client
npm start            # prisma migrate deploy, then boots the server
npm run build        # production client build only
```

```bash
# server (from server/)
npm run dev          # nodemon on src/index.js, port 3001
npm start            # plain node
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:push      # prisma db push (no migration file)
npm run db:seed      # node src/prisma/seed.js
npm run db:studio    # prisma studio

# client (from client/)
npm run build        # one-shot esbuild -> dist/
npm run dev          # esbuild watch mode
npm run clean        # rm -rf dist
```

No test runner is wired up yet. When one is added, document the single-test invocation here.

## Architecture

Two independent packages, deployed as one Railway service that serves the API:

- `server/` — Express API, CommonJS. `src/index.js` only loads dotenv, builds the pino logger, and
  calls `listen`; `src/app.js` builds and exports the app without listening, so it stays importable
  for tests. Currently only `GET /api/health` exists.
- `client/` — React 18 SPA bundled by a hand-written `esbuild.config.js`. `npm run dev` runs
  `dev-server.js`, which watches and serves `dist/` on port 3000 with an SPA fallback (esbuild's
  own serve mode cannot rewrite unknown paths to `index.html`). `public/index.html` is copied to
  `dist/` on every build.

### Production runs as one process

When `NODE_ENV=production`, `app.js` serves `client/dist` and falls back to `index.html` for any
non-`/api/`, non-`/ws/` path, so the Express server hosts both the API and the SPA on one port.
The 404 handler is scoped to `/api` precisely so it cannot swallow client-side routes. `npm run
build` alone does **not** set `NODE_ENV`, so a local production bundle needs
`NODE_ENV=production npm run build`.

`src/utils/validateEnv.js` runs before anything else in `index.js` and exits 1 on a missing or
placeholder-valued required secret, rather than failing later on the first request that needs it.

### Prisma lives outside the default location

The schema is at `server/src/prisma/schema.prisma`, not `server/prisma/`. `server/package.json`
therefore carries a `"prisma": { "schema": "src/prisma/schema.prisma" }` block — without it, every
`prisma` CLI command fails to find the schema. Keep that block if you move the file.

The data model centers on `User`, which owns four child tables: `ContextFile` (the athlete context
that evolves over time, one row per `FileType` per user, enforced by `@@unique([userId, fileType])`),
`ChatMessage`, `GeneratedWorkout`, and `Session`. Workouts move through a `WorkoutStatus` lifecycle:
`PROPOSED → ACCEPTED → PUSHED → COMPLETED | SKIPPED`.

### Constants encode COROS API facts

`server/src/constants/` holds three lookup tables that later phases depend on, and that are not
derivable from anything else in the repo:

- `sportTypes.js` — COROS numeric sport codes (`OUTDOOR_RUN: 100` … `ALL: 65535`).
- `lapColumnMap.js` — COROS returns lap data with **Chinese column headers**; this maps them to
  English keys. Any lap parsing must go through it.
- `cacheTTL.js` — per-MCP-tool cache lifetimes in seconds. Slow-changing profile data caches for a
  day; recovery and stress for 15 minutes.

## Conventions

- React files use `.js`, never `.jsx`. esbuild is configured with `loader: { '.js': 'jsx' }` and the
  automatic JSX runtime, so no React import is needed.
- Server is CommonJS (`require`/`module.exports`). Client is ESM.
- Styling: CSS Modules for components, `client/src/styles/global.css` for the base layer. Dark theme
  (`#0a0a0a` background). No Tailwind, no styled-components.
- Build tooling is esbuild only — no Vite, no CRA.
- Do not add dependencies beyond those already in the two `package.json` files without being asked.
