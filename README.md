# Chessfork

A greenfield functional successor to Chessigma, built as a robust chess improvement platform rather than a thin clone.

## What is implemented

- Chesssigma-style PGN review flow: `/` accepts pasted PGN and redirects to `/analysis?pgn=...`
- `/analysis` renders a three-column Game Review with move classifications, `react-chessboard`, keyboard navigation, autoplay, right-click board actions, and a lazy `recharts` win-probability chart
- `POST /api/analyze` accepts `{ "pgn": "...", "mode": "quick" | "deep" }` and returns metadata, classified moves, chart data, statistics, and a saved report URL
- Next.js App Router frontend with a complete canonical route map
- Shared chess domain modules for FEN normalization, PGN parsing, legal move search, engine scoring, opening detection, rating math, cache keys, and training synthesis
- API routes for PGN analysis, Chess.com import, Lichess import, position evaluation, puzzle attempts, leaderboards, and coach actions
- Report-centric analysis pages, puzzle training, daily challenge, coach snapshot, pricing, games library, wrapped recap, blog, legal pages, `robots.txt`, `sitemap.xml`, `manifest`, and `llms.txt`
- Real backend wiring for Postgres persistence, BullMQ/Redis queueing, database seed scripts, and a backend health endpoint
- Initial Vitest coverage for core chess logic

## Stack

- Next.js 16 with TypeScript and Tailwind CSS
- Drizzle ORM + PostgreSQL schema definitions
- Supabase Auth interface
- Stripe billing interface
- BullMQ + Redis queue interface
- MDX content via frontmatter-powered blog loading

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Paste a PGN on the homepage, or call the analysis API directly:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d "{\"pgn\":\"1. e4 e5 2. Nf3 Nc6 *\",\"mode\":\"quick\"}"
```

## Running with the backend

1. Populate environment variables from `.env.example`.
2. Start Postgres and Redis:

```bash
npm run backend:up
```

3. Push the schema and seed the backend:

```bash
npm run db:push
npm run db:seed
```

4. Start the web app:

```bash
npm run dev
```

5. Optional: start the queue worker for deep-analysis jobs:

```bash
npm run worker
```

6. Check backend status at [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run backend:up
npm run backend:down
npm run db:generate
npm run db:push
npm run db:seed
npm run worker
npm run engine:diagnostics
```

## Notes

- Chess.com and Lichess imports attempt live public fetches and fall back to bundled sample data if no reachable public game is available.
- The fallback evaluator is intentionally deterministic: it generates legal moves, searches with alpha-beta pruning, scores material/king safety/pawn structure/space/activity, and blends in a compact neural-style evaluation layer. When Stockfish is installed, the server uses the bundled Stockfish path instead.
- Stockfish analysis defaults to `depth=15` for quick reports, `depth=20` for deep reports, `MultiPV=1` for best-move searches, and a minimum `movetime=500ms` safety pass. Critical moves re-search with `MultiPV=3` for alternatives.
- Engine resources default to all available CPU cores, `Hash=1024`, and optional Syzygy support through `STOCKFISH_SYZYGY_PATH`.
- Opening books can be configured with `BOOK_PATH`, `OPENING_BOOK_PATH`, or `STOCKFISH_OPENING_BOOK_PATH`. `BOOK_PATH=vendor/books/Perfect2021.bin` is accepted for compatibility with common Polyglot setups.
- Python worker reference code for CAPS, Syzygy, and Polyglot lives in `docs/python-engine-integration.md`.
- `BACKEND_DRIVER=memory` keeps the app fully in-memory. `BACKEND_DRIVER=hybrid` or `database` enables Postgres-backed repositories when `DATABASE_URL` is present.
- If Redis is not configured, deep-analysis requests still work, but queue fan-out is skipped gracefully.
