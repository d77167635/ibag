# Iris — Phase 1 (Intelligence & Reporting Only)

No money moves in this codebase. See `iris-architecture.md` (project docs) for
the full design rationale. This repo contains:

```
backend/    Express + TypeScript API — Plaid Link, webhooks, sync, round-up
            simulation engine, dashboard read endpoints. Holds all secrets.
frontend/   React + Vite app — auth (Supabase), Plaid Link UI, dashboard.
            Never talks to Plaid or Supabase's service role directly.
supabase/
  migrations/001_init_schema.sql   Full schema: raw Plaid mirror tables,
            normalized transactions, domain/subdomain/category hierarchy,
            round-up simulation ledger, audit log, RLS on every table.
```

## Core rule

Every number shown anywhere in the app must trace to a row in a `plaid_raw_*`
table (an untouched Plaid API response) or a row in `calculation_audit_log`
(a logged, reproducible calculation on stored data). No seeded data, no
hardcoded fixtures, no client-side invented numbers — enforced structurally:
`backend/src/services/sync.ts` is the only code path allowed to write
transaction/account/balance rows.

## First-time setup

1. **Supabase**: open the SQL editor in your Supabase project and run
   `supabase/migrations/001_init_schema.sql`.
2. **Backend**: `cd backend && cp .env.example .env`, fill in your Plaid
   sandbox credentials and Supabase service-role key, then `npm install && npm run dev`.
3. **Frontend**: `cd frontend && cp .env.example .env.local`, fill in your
   Supabase URL/anon key, then `npm install && npm run dev`.
4. Sign up in the app (Supabase Auth), connect a sandbox card via Plaid
   Link, and confirm the dashboard populates from real synced data —
   an empty dashboard before connecting is correct behavior, not a bug.

## Deploying (Render)

- **Backend** → Render Web Service, runtime Node, build `npm install && npm run build`,
  start `npm start`, pointed at this repo's `backend/` directory, with the
  same env vars as `.env.example` set in the Render dashboard (never commit `.env`).
- **Frontend** → Render Static Site, build `npm install && npm run build`,
  publish path `dist`, pointed at `frontend/`, with `VITE_*` env vars set
  at build time.
- Set `PLAID_WEBHOOK_URL` on the backend to `https://<your-backend>.onrender.com/webhooks/plaid`
  once the backend has a stable Render URL, and register that same URL in
  the Plaid dashboard.

## What's intentionally not built yet

- `category_mapping` table is seeded empty — the Plaid PFC → subdomain
  mapping is real taxonomy work for the team, not something to auto-generate.
- Liabilities/Income/Investments sync and the cross-product intelligence
  features (interest-cost attribution, safe-to-spend, etc.) — `sync.ts`
  currently pulls Accounts, Balance, and Transactions; extend it product by
  product, following the same raw-mirror-then-normalize pattern.
- Iris inline explanations and the LLM-backed conversational assistant —
  by design, built last, once the Intelligence Engine has enough surface
  area for it to answer from (per the build sequence in the architecture doc).
- Encryption at rest for `plaid_access_token` — currently stored plaintext
  in Supabase for scaffold simplicity; before any real user data, wrap this
  in Supabase Vault or app-layer envelope encryption.
