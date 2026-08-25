# 🏆 SportsHub Ultra-Fast Global Live Score Tracking Platform

A production-ready, ultra-fast global multi-sport live score tracking web application, Cloudflare Kumo-style administrative management dashboard, and high-concurrency Go backend service containerized with Docker on dedicated **non-standard, uncommon ports** with full **Supabase Realtime & Storage integration**.

---

## 1. Port Allocation Matrix (Non-Standard Ports)

Every service, database, cache, and reverse proxy is strictly mapped using the following uncommon port mappings:

| Service | Container Internal Port | Non-Standard Host Port | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Web App (Next.js)** | `3000` | **`17080`** | Public Web Application UI (Live Ticker, 2D Pitch, PiP, Accumulators) |
| **Backend API & WebSockets (Go)**| `8080` | **`18443`** | Ingestion Hub, REST API, WebSocket Gateway |
| **Admin Dashboard (Kumo UI)** | `3000` | **`19080`** | Cloudflare Kumo Admin Control Panel & Ingestion Telemetry |
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
- ☁️ **Cloudflare Kumo Admin Control Panel**: [http://localhost:19080](http://localhost:19080)
- 🚀 **Go Backend API & WebSocket Endpoint**: `http://localhost:18443` (`ws://localhost:18443/ws`)
- 🐘 **PostgreSQL / Supabase**: `localhost:25432` (`postgres://postgres:postgres@localhost:25432/sportsdb`)
- ⚡ **Redis**: `localhost:26379`

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

### B. Cloudflare Kumo-Style Admin Dashboard (`http://localhost:19080`)
1. **Real-time Ingestion Monitor**:
   - Live telemetry showing polling intervals, ESPN vs The Odds API quota meters, ingestion latency (ms), and Redis memory stats.
2. **Live Match Orchestrator**:
   - Manually override scores, periods, and minutes.
   - Trigger simulated test goals that instantly broadcast over WebSockets & Supabase Realtime to all connected client tabs.
   - WebSocket client session inspector.
3. **Financial & Subscription Hub**:
   - Revenue analytics combining Flutterwave (Cards, Bank Transfer, USSD) and Cryptomus (USDT, BTC, ETH, TON, SOL).
   - Webhook signature verification logs with replay testing sandbox.
4. **Bet Slip Parser Health**:
   - Booking code decode metrics and interactive sandbox.

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
| `GET` | `/api/v1/admin/telemetry` | Live ingestion rates, latency & Redis memory |
| `POST` | `/api/v1/admin/matches/{id}/simulate-goal` | Trigger test goal with instant Redis Pub/Sub broadcast |

---

## 6. Testing Booking Codes

Use these sample booking codes in the **Import Bet Ticket** modal or Admin Sandbox:

- `BC99214` - **SportyBet**: 3-leg EPL + UCL + NBA accumulator
- `B9JA-44912` - **Bet9ja**: 4-leg European football combo
- `1X-88231` - **1xBet**: High-multiplier multi-sport ticket
- `BK-10294` - **BetKing**: Over/Under goals accumulator
