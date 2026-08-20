// TEMPORARY minimal boot -- proves GitHub -> Render -> Supabase works with
// the smallest possible surface area, before the rest of the app (routes,
// jobs, scheduler) gets committed. Swap this back for the real index.js
// once you confirm this goes live and /health returns ok.
require('dotenv').config();

const express = require('express');
const db = require('./db');

const app = express();
app.disable('x-powered-by');

app.get('/health', async (req, res) => {
  try {
    const result = await db.pool.query('SELECT now() AS db_time');
    res.json({ status: 'ok', dbConnected: true, dbTime: result.rows[0].db_time });
  } catch (err) {
    console.error('DB health check failed:', err.message);
    res.status(503).json({ status: 'error', dbConnected: false, message: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'iBag API is live. Backend build in progress.' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`iBag API (minimal boot) listening on ${port}`);
});

module.exports = app;
