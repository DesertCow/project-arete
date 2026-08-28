# Arete — AI Coaching for Athletes

Arete is an AI-powered coaching platform that connects to COROS wearable data via MCP (Model Context
Protocol) to deliver personalized training plans, recovery guidance, and performance analysis for
multi-sport athletes. It is built as a reference application demonstrating MCP integration with Claude AI.

## Features

Planned capabilities for the full build:

- Personalized AI coaching powered by Claude, with full athlete context
- Live COROS wearable integration via MCP (22 verified data endpoints)
- Multi-horizon training planning — today, this week, this month, the objective
- Adaptive workout generation based on recovery, sleep, HRV, and training load
- A context file system that evolves with the athlete over time
- Demo mode with 4 pre-built athlete profiles

## Tech Stack

| Layer      | Technology                     |
| ---------- | ------------------------------ |
| Frontend   | React 18, esbuild, CSS Modules |
| Backend    | Node.js, Express               |
| Database   | PostgreSQL, Prisma             |
| AI         | Claude API (`@anthropic-ai/sdk`) |
| Wearables  | MCP (`@modelcontextprotocol/sdk`) |
| Deployment | Railway (nixpacks)             |

## Getting Started

```bash
git clone <repo-url> project-arete
cd project-arete

cd server && npm install
cd ../client && npm install

cp ../server/.env.example ../server/.env    # then fill in the values

cd ../server
npx prisma generate
npx prisma migrate dev

npm run dev                                 # server on :3001
cd ../client && npm run dev                 # client bundle, watch mode
```

## Environment Variables

All server configuration is read from `server/.env`. See
[`server/.env.example`](server/.env.example) for the full list and expected format.

## Project Status

Phase 1 (Scaffold) complete. 16-phase build plan in progress.

## License

Private / All Rights Reserved.

## Author

Clayton Skaggs
