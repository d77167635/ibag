// Background worker process. Run separately from the web service (Render:
// a Background Worker, `npm run worker`, not the Web Service). This file
// did not exist in any prior package version — the job modules it wires
// together (`jobs/sync.js`, `jobs/webhookWorker.js`, `jobs/reconciliation.js`,
// `jobs/incomeReview.js`) were always exported as plain functions, with
// nothing that actually scheduled and ran them on a loop. See CHANGELOG.md.
//
// Four independent polling loops, each guarded against overlapping runs so
// a slow iteration never causes two copies of the same job to run at once:
//
//   1. Webhook queue drain      — frequent (default 15s). This is the
//      primary path: Plaid webhooks land in `plaid_webhook_events`
//      (routes/webhook.js) and this loop calls `runSync` for the
//      corresponding item, with the retry/backoff/dead-letter handling
//      already implemented in webhookWorker.js.
//   2. Periodic full-item sync  — infrequent (default 6h) safety net for
//      items that haven't produced a webhook recently (a missed webhook,
//      a delivery outage, or the Sandbox's own polling-only behavior for
//      some products). Iterates every active plaid_items row directly.
//   3. Reconciliation           — infrequent (default 24h). Runs all 11
//      invariants from Section 29.22 (jobs/reconciliation.js).
//   4. Income review            — moderate (default 1h). Resolves
//      PENDING_INCOME_REVIEW transactions once enough signal has
//      accumulated (jobs/incomeReview.js).

require('dotenv').config();

const db = require('./db');
const { processWebhookEvents } = require('./jobs/webhookWorker');
const { runSync } = require('./jobs/sync');
const { reconcileAll } = require('./jobs/reconciliation');
const { runIncomeReviewForAllPendingUsers } = require('./jobs/incomeReview');

const WEBHOOK_POLL_MS = Number(process.env.WORKER_WEBHOOK_POLL_MS || 15000);
const SYNC_POLL_MS = Number(process.env.WORKER_SYNC_POLL_MS || 6 * 60 * 60 * 1000);
const RECONCILIATION_POLL_MS = Number(process.env.WORKER_RECONCILIATION_POLL_MS || 24 * 60 * 60 * 1000);
const INCOME_REVIEW_POLL_MS = Number(process.env.WORKER_INCOME_REVIEW_POLL_MS || 60 * 60 * 1000);

function log(type, extra = {}) {
  console.log(JSON.stringify({ type, ts: new Date().toISOString(), ...extra }));
}

function logError(type, err, extra = {}) {
  console.error(JSON.stringify({ type, ts: new Date().toISOString(), message: String(err && err.message || err), ...extra }));
}

// Runs `fn` on an interval, skipping a tick entirely (rather than queueing
// it) if the previous run is still in flight, so a slow database or a
// Plaid outage can't cause overlapping runs of the same job to pile up.
function schedule(name, intervalMs, fn) {
  let running = false;
  const tick = async () => {
    if (running) {
      log('worker_tick_skipped_overlap', { job: name });
      return;
    }
    running = true;
    try {
      const result = await fn();
      log('worker_tick', { job: name, result });
    } catch (err) {
      logError('worker_tick_failed', err, { job: name });
    } finally {
      running = false;
    }
  };
  tick(); // run once immediately on boot, then on the interval
  return setInterval(tick, intervalMs);
}

async function drainWebhookQueue() {
  const processed = await processWebhookEvents(25);
  return { processed };
}

async function periodicFullSync() {
  const { rows: items } = await db.withServiceRole((client) =>
    client.query(`SELECT plaid_item_id FROM plaid_items WHERE status = 'active'`)
  );
  let succeeded = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await runSync({ itemId: item.plaid_item_id, trigger: 'periodic_poll' });
      succeeded++;
    } catch (err) {
      failed++;
      logError('periodic_sync_item_failed', err, { plaidItemId: item.plaid_item_id });
    }
  }
  return { itemCount: items.length, succeeded, failed };
}

async function runReconciliation() {
  return reconcileAll();
}

async function runIncomeReview() {
  return runIncomeReviewForAllPendingUsers();
}

db.pool.query('SELECT 1').then(() => {
  log('worker_boot', {
    webhookPollMs: WEBHOOK_POLL_MS,
    syncPollMs: SYNC_POLL_MS,
    reconciliationPollMs: RECONCILIATION_POLL_MS,
    incomeReviewPollMs: INCOME_REVIEW_POLL_MS,
  });

  schedule('webhook_drain', WEBHOOK_POLL_MS, drainWebhookQueue);
  schedule('periodic_full_sync', SYNC_POLL_MS, periodicFullSync);
  schedule('reconciliation', RECONCILIATION_POLL_MS, runReconciliation);
  schedule('income_review', INCOME_REVIEW_POLL_MS, runIncomeReview);
}).catch((err) => {
  console.error('FATAL: worker database startup check failed', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('worker_shutdown', { signal: 'SIGTERM' });
  process.exit(0);
});
