# SOAR Command Center — Frontend

A React frontend for the **SOAR Incident Containment Engine** FastAPI backend: alert triage,
threat intelligence enrichment, and mock SOAR playbook execution, presented as a dark SOC
analyst console.

This frontend only renders data returned by the real backend. It does not hardcode alerts,
dashboard values, or threat intelligence results, and it never claims simulated containment
is real containment.

## Technology Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4 (dark SOC theme via CSS `@theme` design tokens)
- React Router 7
- Axios (centralized API client)
- TanStack Query v5 (server state, caching, mutations)
- Recharts (dashboard/analytics charts)
- Lucide React (icons)

## Project Structure

```text
src/
├── api/                 # One module per backend domain; centralized Axios client
│   ├── client.ts         # Axios instance, base URL, normalized error handling
│   ├── alerts.ts          # CRUD, status updates, enrichment, execute, timeline
│   ├── dashboard.ts       # /dashboard, /stats
│   ├── playbooks.ts       # /playbooks
│   ├── threatIntel.ts     # re-exports per-alert enrichment (no global feed exists)
│   └── system.ts          # /health, /version
├── hooks/                # TanStack Query hooks per domain + query key factory
├── context/              # Toast notification provider
├── components/
│   ├── layout/            # Sidebar, Header, AppLayout
│   ├── dashboard/          # MetricCard, charts, SOC overview
│   ├── alerts/             # Table, filters, badges, create modal, status selector, timeline
│   ├── threat-intel/       # Risk score gauge, VirusTotal/AbuseIPDB cards, panel
│   ├── playbooks/          # Execution confirmation modal
│   └── common/             # Loading/Error/Empty states, ConfirmDialog, Button, PageHeader
├── pages/                # One page per route
├── types/                # TypeScript interfaces mirroring the FastAPI response contract
└── utils/                # Formatting, class merging, severity/status/domain mappings
```

## Prerequisites

- Node.js 20+
- The SOAR Incident Containment Engine backend running locally (see the backend's own
  README/API_USAGE.md)

## Installation

```bash
npm install
```

## Environment Setup

Copy the example environment file and adjust if your backend runs somewhere other than the
default:

```bash
cp .env.example .env
```

```text
# .env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

This is the **only** backend configuration the frontend needs. Never add API keys
(VirusTotal, AbuseIPDB) or database credentials to `.env` — anything prefixed `VITE_` is
bundled into public, client-side JavaScript and is visible to anyone who opens the app.

## Development Server

Start the backend first (see its README), then:

```bash
npm run dev
```

The app runs at `http://localhost:5173` and expects the backend's CORS configuration to allow
that origin (already configured in `app/main.py`).

## Production Build

```bash
npm run build
```

Type-checks with `tsc -b` and bundles with Vite into `dist/`. Preview the production build
locally with:

```bash
npm run preview
```

## Linting

```bash
npm run lint
```

## Backend Connection Notes

- All operational data (alerts, dashboard metrics, stats, enrichment, playbook results,
  timelines) comes from the live backend — nothing is hardcoded.
- Threat intelligence enrichment is only fetched when an analyst explicitly clicks "Run
  Enrichment" on an alert's detail page — it is never fetched automatically for every row in
  the alert list.
- The backend has no endpoint to confirm whether enrichment came from a live provider or its
  mock fallback. The UI flags likely-mock data by matching the documented fallback constants
  (`VirusTotal: malicious=true, score=92`; `AbuseIPDB: score=84, country=US`) and says so
  explicitly — this is a heuristic, not a guarantee.
- Playbook execution is clearly labeled **SIMULATED** everywhere it appears; no real
  firewall/EDR/network action is implied.
- The **Incidents** page shows an honest "not available" state, since the backend currently
  exposes no incident-management API — it does not fabricate incident data.
- The **Activity** page is built from real `GET /recent-alerts` data, since the backend has
  no separate global activity/audit log endpoint.

## Known Backend Limitations (discovered during integration)

- `GET /alerts/{id}/timeline` returns static, non-persisted events with no timestamps —
  the UI handles missing timestamps gracefully.
- `playbooks_executed` in `/dashboard` is derived from high-risk alert count, not a persisted
  execution history (per the backend's own API_USAGE.md note).
- Risk scores from `/alerts/{id}/enrichment` and `/alerts/{id}/execute` can exceed 100 (base
  severity score + VirusTotal/AbuseIPDB modifiers) — the UI displays the true value while
  visually capping the progress bar fill at 100%.
- There is no incidents API, no global activity/audit API, and no explicit
  live-vs-mock-enrichment flag on the enrichment response.
