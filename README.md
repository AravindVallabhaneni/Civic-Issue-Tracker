# CivicPulse — Hyperlocal Civic Issue Tracker

A production-grade full-stack platform for citizens to report local civic issues (broken streetlights, garbage pileup, potholes, water leaks), with automatic **geospatial clustering**, **department routing**, **live map updates**, and a **status tracking pipeline**.

---

## 🏗️ Architecture

```
hyperlocal/
├── backend/          # Node.js + Express + TypeScript API
│   └── src/
│       ├── config/   # Supabase clients, env, logger
│       ├── services/ # Clustering engine, geocoding, storage
│       ├── routes/   # REST API endpoints
│       ├── jobs/     # Cron-based escalation
│       └── middleware/
├── frontend/         # React + Vite + TailwindCSS
│   └── src/
│       ├── pages/    # Map, Report, Cluster Detail, Stats, Dashboard
│       ├── components/
│       ├── store/    # Zustand (auth + map state)
│       └── lib/      # Supabase client
└── database/
    └── schema.sql    # PostGIS schema + RLS + stored procedures
```

## 🔑 Key Technical Features

### 1. Geospatial Deduplication / Clustering Engine
**The core differentiator.** When a new report arrives:
1. Queries `issue_clusters` via PostGIS `ST_DWithin` for open clusters of the same category within **150m**
2. If a cluster exists → attaches report, **recomputes centroid** (average of all member locations), increments count
3. If no cluster → creates one and **auto-routes to the correct department**
4. **Priority algorithm**: `score = log2(report_count + 1) × 10 + (age_days × 2)` — log scale prevents report flooding from instantly maxing priority; age factor ensures old issues aren't forgotten

### 2. Row Level Security (Postgres RLS)
Defense-in-depth beyond API-layer auth checks:
- Citizens: read all clusters, insert own reports
- Department staff: update clusters assigned to their `department_id`
- Admins: full access

### 3. Supabase Realtime
Subscribes to `issue_clusters` Postgres logical replication changes → WebSocket broadcast to all connected clients. Map updates **live without polling**.

### 4. Escalation Cron Job
Runs hourly. Finds clusters `open/assigned` older than N days with no activity and bumps priority + 10, ensuring stale issues surface in the dashboard.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project with PostGIS enabled

### 1. Database Setup
1. In Supabase SQL editor, run `database/schema.sql` in full
2. Enable the `issue-photos` Storage bucket (public read)

### 2. Backend
```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

App: http://localhost:5173  
API: http://localhost:3001

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/reports` | Create report (multipart: photo + JSON fields) |
| `GET` | `/api/reports/:id` | Get report by ID |
| `GET` | `/api/clusters` | Viewport-filtered cluster list |
| `GET` | `/api/clusters/:id` | Cluster detail + status history |
| `PATCH` | `/api/clusters/:id/status` | Update status (staff/admin only) |
| `GET` | `/api/departments` | List departments |
| `GET` | `/api/stats/public` | Public transparency stats |

---

## 🧪 Running Tests

```bash
cd backend
npm test           # Unit tests for clustering priority algorithm
npm run test:watch # Watch mode
```

Test coverage focuses on the clustering engine — priority computation, centroid recomputation, and cluster creation logic.

---

## 🏗️ Scalability Notes (for interviews)

- **Why PostGIS over haversine in app code?** — ST_DWithin uses a GiST index bounding-box pre-filter, making proximity queries O(log n) instead of O(n) full table scan.
- **Scaling beyond PostGIS?** — At 1M+/day: geohash the centroid, shard by geohash prefix, use Redis GEOSEARCH for sub-ms proximity.
- **Why 150m radius?** — Large enough to capture the same physical issue from different vantage points; small enough to avoid merging issues from different streets.
- **Cluster centroid drift** — As reports join, the centroid shifts to the true center of all reports, not just the first one. This happens via `ST_Centroid(ST_Collect(location))` server-side.

---

## 🛡️ Production Hardening

- ✅ Zod input validation on all endpoints
- ✅ Rate limiting (10 reports per 15 min per IP)
- ✅ File type + size validation
- ✅ Structured Pino logging with request IDs
- ✅ Helmet security headers
- ✅ Environment validation on startup
- ✅ RLS policies (defense in depth)
- ✅ Service-role key never exposed to frontend

---

## Tech Stack

- **Backend**: Node.js + Express + TypeScript, tsx (dev server)
- **Database**: Supabase (Postgres + PostGIS) + RLS
- **Auth**: Supabase Auth (JWT)
- **Storage**: Supabase Storage
- **Frontend**: React 18 + Vite + TailwindCSS
- **Map**: Leaflet + OpenStreetMap
- **State**: Zustand
- **Charts**: Recharts
- **Jobs**: node-cron
- **Logging**: Pino
- **Validation**: Zod
