# CineMatch — Autonomous Movie Booking

One command is all CineMatch needs. It understands your intent, compares theatres, and prepares your booking — you pick your seats and finish the payment.

## Features

- **Natural-language intent parsing** — "book 2 tickets for tomorrow night" → movie, city, date, time, tickets, screen, language, budget.
- **Autonomous browser agent** — searches BookMyShow, selects the right movie, lists theatres by price & distance, opens the showtime and seat map, then proceeds through to the payment page.
- **Streamed progress (SSE)** — step-by-step live updates, theatre cards, reasoning timeline, seat map.
- **Optional voice input** and geolocation-based city detection.

## Tech

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query · `webcmd` headless browser · SSE

## Getting Started

```bash
npm install
cp .env.example .env.local   # add your API key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and type a request like *"book 2 tickets for tomorrow"*.

### Environment

```env
OPENCODE_ZEN_API_KEY=your_api_key_here   # AI intent parser (fallback works without it)
DEBUG_WEBCMD=true                        # optional verbose agent logs
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Lint |

## Structure

```
app/            pages, layout, api routes (intent + agent SSE)
Agent/          autonomous booking agent (browser, extractor, planner, ranking)
services/ai/    intent analyzer, geolocation, theatre logic
components/     landing, workspace, thinking, ui
```

## How It Works

1. You type a booking request.
2. Intent is parsed into a structured booking.
3. The agent drives BookMyShow via a headless browser to list and pick a theatre & showtime.
4. You select seats on the live page.
5. The agent proceeds through checkout and stops at payment — you finish the payment.

## Note

Booking automates a live third-party site (BookMyShow), so robustness depends on its page structure. The agent prefers real movie results and falls back gracefully if a step is missed.