const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const servicePool = new Pool({
  connectionString: process.env.SERVICE_DATABASE_URL,
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
    // SET LOCAL scopes both to this transaction only; they reset
    // automatically on COMMIT/ROLLBACK, before the client returns to the
    // pool, so a later reused connection never inherits either setting.
    await client.query('SET LOCAL ROLE ibag_app');
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
    await client.query('SET LOCAL ROLE ibag_service');
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
