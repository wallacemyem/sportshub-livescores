# 📡 SlipRadar — track every bet slip live

SlipRadar takes a booking code from SportyBet, Bet9ja, 1xBet, BetKing, MSport or MozzartBet, resolves every leg of the accumulator to a live fixture, and streams the result — scores, clocks, settlement state and a running cash-out estimate — in real time.

The stack is a Next.js web app, an admin control panel, and a high-concurrency Go backend, containerised with Docker on dedicated **non-standard ports**, with **Supabase Realtime & Storage** integration.

> SlipRadar is read-only: it tracks bets that were already placed at a sportsbook. It never places, edits or settles a wager.

---

## 1. Port Allocation Matrix (Non-Standard Ports)

Every service, database, cache, and reverse proxy is strictly mapped using the following uncommon port mappings:

| Service | Container Internal Port | Non-Standard Host Port | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Web App (Next.js)** | `3000` | **`17080`** | Landing, pricing, live tracker, blog, support, account |
| **Backend API & WebSockets (Go)**| `8080` | **`18443`** | Ingestion Hub, REST API, WebSocket Gateway |
| **Admin Dashboard (standalone)** | `3000` | **`19080`** | Standalone admin panel (also served in-app at `/admin`) |
| **PostgreSQL / Supabase Database**| `5432` | **`25432`** | Core relational database with Supabase Realtime WAL replication |
| **Redis In-Memory State** | `6379` | **`26379`** | Real-time score state hashes & Pub/Sub broker |

---

## 2. Supabase Realtime & Storage Integration

```
                      ┌───────────────────────────────────────────────┐
                      │              Supabase Cloud / Self-Host       │
                      │  • Realtime WAL Publication (supabase_realtime)│
                      │  • Storage CDN Buckets (sports-assets)        │
                      │  • PostgreSQL DB on port 25432                │
                      └──────────────────────┬────────────────────────┘
                                             │
                      ┌──────────────────────┴────────────────────────┐
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │ Next.js 14 Web App      │                     │ Go High-Concurrency     │
         │     (Port: 17080)       │                     │ Backend (Port: 18443)   │
         │ • useSupabaseRealtime   │                     │ • Storage Uploader      │
         │ • Instant Table Streams │                     │ • REPLICA IDENTITY FULL │
         │ • Supabase Storage CDN  │                     │ • Multi-Bookmaker Loop  │
         └─────────────────────────┘                     └─────────────────────────┘
```

1. **Supabase Realtime Live Streaming**:
   - PostgreSQL configured with `wal_level=logical` and `REPLICA IDENTITY FULL` on `matches`, `match_events`, `odds_snapshots`, and `bet_slips`.
   - The frontend uses `@supabase/supabase-js` and `useSupabaseRealtime` to receive instant row mutations from the database.
2. **Supabase Storage**:
   - `sports-assets` bucket configuration for storing and streaming team logos, player avatars, pitch assets, and bet slip snapshots.
   - Go backend helper (`internal/supabase/storage.go`) uploads and resolves public CDN URLs.

---

## 3. Quick Start (Single Command)

Spin up all containerized services with a single command:

```bash
docker compose up --build
```

### Accessing the Services:
- 🌐 **Client Web App**: [http://localhost:17080](http://localhost:17080)
- ☁️ **Standalone Admin Panel**: [http://localhost:19080](http://localhost:19080)
- 🚀 **Go Backend API & WebSocket Endpoint**: `http://localhost:18443` (`ws://localhost:18443/ws`)
- 🐘 **PostgreSQL / Supabase**: `localhost:25432` (`postgres://postgres:postgres@localhost:25432/sportsdb`)
- ⚡ **Redis**: `localhost:26379`

---

## 3b. Web App Routes

| Route | Purpose |
| :--- | :--- |
| `/` | Marketing landing page |
| `/pricing` | Plan comparison (Free / Pro / Elite), billing toggle, FAQs |
| `/pro` | Checkout. Accepts `?plan=` (pro, elite) and `?cycle=` (monthly, annual) from `/pricing` |
| `/live` | The tracker: multi-sport feed, slip tracking, match detail panel |
| `/match/[id]` | Full match page: stats, timeline, lineups, odds, 2D pitch |
| `/blog`, `/blog/[slug]`, `/blog/editor` | Editorial |
| `/support` | Knowledge base, ticket submission, ticket history |
| `/account`, `/auth/*` | Profile, plan status, sign in / register / reset |
| `/admin` | Admin console served inside the main app |

Plan prices live in two places that must stay in step: `PLANS` in `frontend/app/pricing/page.tsx` and `PLAN_PRICING` in `frontend/app/pro/page.tsx`.

---

## 4. Key Feature Highlights

### A. Client Web App (`http://localhost:17080`)
1. **Multi-Sport Real-Time Feeds**:
   - Dual-channel streaming: Go High-Concurrency WebSockets + Supabase Realtime.
   - Soccer, Basketball, Tennis, NFL, Cricket, Baseball.
   - Breaking live ticker marquee with real-time match status indicators.
2. **Interactive 2D Pitch & Court Visualizer**:
   - Real-time animated ball position tracking (`ball_position_x`, `ball_position_y`).
   - Dynamic attacking pressure gradient overlays (Home vs Away momentum).
3. **Picture-in-Picture (PiP) Scoreboard**:
   - Document PiP API (`window.documentPictureInPicture`) launching a draggable native OS floating score widget.
4. **Lock Screen & Media Session Integration**:
   - HTML5 Media Session API streaming game clock and scores directly to OS notification bars and lock screens.
5. **Bet Slip Auto-Looping Accumulator Tracker**:
   - Automatically loops across **SportyBet**, **Bet9ja**, **1xBet**, and **BetKing**.
   - Populates slip upon discovery; only notifies user when no bookmaker matches.
   - Dynamic Cash-Out offer algorithm calculated via Poisson decay and live momentum.
6. **Celebratory Animations**:
   - Canvas-confetti fireworks triggered on live goals and accumulator cashouts.

### B. Admin Dashboard (`/admin`, or `http://localhost:19080`)
Six sections behind a persistent left rail:

1. **Overview** — users, MRR, slips scanned, active slips; a 7-day revenue trend; plan split; scans per sportsbook; and a *Needs attention* list linking straight to failed payments, unanswered tickets and suspended accounts.
2. **Users** — every account with plan, status, country, slips scanned, active slips, lifetime value, last seen and signup date. Click a row for a detail panel showing that account's scanned slips and payments, plus plan and suspend controls.
3. **Slips scanned** — every resolved booking code with the account that scanned it, sportsbook, legs (won/lost), stake, odds, status and parse time.
4. **Transactions** — payments across Flutterwave and Cryptomus with the payer attached, method, amount, status and billing cycle.
5. **Live ops** — feed telemetry, API quota headroom, and a match orchestrator for correcting scorelines and broadcasting test events.
6. **Support** — the ticket queue alongside the thread and a reply box.

Every table shares one component: search, filters, sortable columns and pagination behave identically throughout. When the API is unreachable the console shows an explicit banner and empty tables — it never substitutes placeholder figures for real ones.

---

## 5. API & WebSocket Specification

### REST API Endpoints (Port 18443)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/healthz` | Health check returning PostgreSQL & Redis status |
| `GET` | `/api/v1/matches?sport={sport}&status={status}` | List matches with optional filters |
| `GET` | `/api/v1/matches/{id}` | In-depth match details, 2D coordinates & stats |
| `GET` | `/api/v1/matches/{id}/odds` | Live consensus & bookmaker odds comparison |
| `POST` | `/api/v1/betslip/import` | Auto-discovery loop for booking codes across all bookmakers |
| `GET` | `/api/v1/betslip/{id}` | Get live accumulator status & cashout offer |
| `POST` | `/api/v1/payments/flutterwave/webhook` | Flutterwave API v3 webhook signature handler |
| `POST` | `/api/v1/payments/cryptomus/webhook` | Cryptomus crypto webhook signature handler |
| `POST` | `/api/v1/payments/simulate` | Sandbox instant user upgrade |
| `GET` | `/api/v1/admin/overview` | KPI snapshot, 7-day trend, plan split, scans per sportsbook |
| `GET` | `/api/v1/admin/users` | Accounts with slips-scanned and lifetime-value aggregates |
| `PATCH` | `/api/v1/admin/users/{id}` | Change an account plan and/or status (active, suspended) |
| `GET` | `/api/v1/admin/slips` | Scanned booking codes, each attributed to its account (`?user_id=` filters) |
| `GET` | `/api/v1/admin/transactions` | Payments with the payer resolved (`?user_id=` filters) |
| `GET` | `/api/v1/admin/telemetry` | Live ingestion rates, latency & Redis memory |
| `POST` | `/api/v1/admin/matches/{id}/simulate-goal` | Trigger test goal with instant Redis Pub/Sub broadcast |

---

## 6. Real Sportsbook Booking Codes

Enter real active booking codes from any supported sportsbook in the **Track Bet Slip** modal:

- **SportyBet** (NG, GH, KE, UG)
- **Bet9ja** (NG)
- **1xBet** (Global)
- **BetKing** (NG)
- **MSport** (NG, GH)
- **MozzartBet** (Global)
