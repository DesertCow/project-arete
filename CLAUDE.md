# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Project Arete** — an AI coaching platform for multi-sport athletes. Claude generates training
guidance from live COROS wearable data pulled through MCP (Model Context Protocol). A 16-phase build
plan; Phase 1 (scaffold) is complete, so most directories are still `.gitkeep` placeholders.

## Commands

Everything is per-package — there is no root `package.json` and no workspace config.

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
- `client/` — React 18 SPA bundled by a hand-written `esbuild.config.js` (no dev server; the watch
  build just rewrites `dist/`). `public/index.html` is copied to `dist/` on every build.

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
