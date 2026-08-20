const { Pool } = require('pg');

// CLOSURE FIX: Supabase Postgres requires SSL (both the direct connection and
// the Supavisor/PgBouncer poolers) — node-postgres does NOT enable SSL by
// default, so without this, connecting from Render to Supabase fails outright
// (commonly surfaces as "error: SSL connection is required" or a connection
// timeout, not an obvious "add ssl:true" hint).
//
// IMPORTANT: do not add `sslmode=...` to DATABASE_URL/SERVICE_DATABASE_URL
// itself — node-postgres silently ignores the `ssl` object below whenever the
// connection string contains an `sslmode` parameter, so the two approaches
// conflict rather than combine. Configure SSL here, in code, only.
//
// `rejectUnauthorized: false` here trusts Supabase's TLS cert without
// pinning Supabase's CA — acceptable for getting Sandbox/staging connected,
// but before PRODUCTION_VALIDATED, download the project's CA certificate
// (Database Settings → SSL Configuration) and switch to
// `{ ca: fs.readFileSync('/path/to/supabase-ca.crt'), rejectUnauthorized: true }`
// for verify-full — this file intentionally does not fabricate that
// certificate content, since it's per-project and must come from your own
// Supabase dashboard.
const SSL_CONFIG = process.env.DATABASE_SSL_DISABLE === 'true'
  ? false
  : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: SSL_CONFIG,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const servicePool = new Pool({
  connectionString: process.env.SERVICE_DATABASE_URL,
  ssl: SSL_CONFIG,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => console.error('Unexpected application DB client error', err));
servicePool.on('error', (err) => console.error('Unexpected service DB client error', err));

async function withUserContext(userId, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "SELECT set_config('app.current_user_id', $1, true)",
      [userId]
    );
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function withServiceRole(fn) {
  const client = await servicePool.connect();
  try {
    await client.query('BEGIN');
    // CLOSURE FIX (was silently missing): plaid_webhook_events, reconciliation_runs,
    // data_quality_events, and audit_trail are RLS-gated on
    // current_setting('app.is_service_role', true)::boolean = true (Section 5.10).
    // Without this line, every write through withServiceRole() to those four
    // tables is rejected by RLS with no explicit error surfaced beyond a generic
    // policy violation — this is the exact "webhook pipeline can't boot" failure
    // mode the spec's own changelog describes as fixed. It was not fixed in the
    // code that shipped; this restores the set_config call the spec's own
    // reference implementation (docs/PROGRAMMING_SPEC.md) always contained.
    await client.query("SELECT set_config('app.is_service_role', 'true', true)");
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  servicePool,
  query: (...args) => pool.query(...args),
  withUserContext,
  withServiceRole,
};
