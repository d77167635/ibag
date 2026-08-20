require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const { router: authRoutes } = require('./routes/auth');
const meRoutes = require('./routes/me');
const linkRoutes = require('./routes/link');
const webhookRouter = require('./routes/webhook');
const dashboardRoutes = require('./routes/dashboard'); // CLOSURE FIX: was never mounted

const app = express();

const required = [
  'DATABASE_URL',
  'SERVICE_DATABASE_URL',
  'PLAID_CLIENT_ID',
  'PLAID_SECRET',
  'ENCRYPTION_KEY',
  'JWT_SECRET',
  'CORS_ORIGIN',
  'API_PUBLIC_URL',
  'WEBHOOK_PUBLIC_URL',
];

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

app.disable('x-powered-by');

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));

// Minimal frontend (public/) — plain HTML/JS, no build step. Served from the
// same Express process/Render service as the API, so there's no second
// deployment or CORS_ORIGIN mismatch to manage. See public/app.js for the
// Plaid Link integration.
const path = require('path');
app.use(express.static(path.join(__dirname, '../../../public')));

// The webhook route MUST receive the exact bytes before JSON parsing.
app.use('/plaid/webhook', require('express').raw({ type: 'application/json', limit: '1mb' }), webhookRouter);

// Ordinary JSON API.
app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || 900000),
  limit: Number(process.env.RATE_LIMIT_LOGIN_MAX || 8),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  identifier: 'auth',
});

app.get('/health', async (req, res) => {
  try {
    await db.pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', code: 'DB_UNAVAILABLE' });
  }
});

app.use('/auth', authLimiter, authRoutes);
app.use(meRoutes);
app.use(linkRoutes);
app.use(dashboardRoutes);

app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    type: 'api_error',
    path: req.path,
    method: req.method,
    code: err.code || 'INTERNAL_ERROR',
    message: err.message,
  }));

  if (res.headersSent) return next(err);
  res.status(err.statusCode || 500).json({
    status: 'error',
    code: err.code || 'INTERNAL_ERROR',
    message: err.expose ? err.message : 'Internal server error.',
  });
});

const port = Number(process.env.PORT || 3000);
db.pool.query('SELECT 1').then(() => {
  app.listen(port, () => console.log(`iBag API listening on ${port}`));
}).catch((err) => {
  console.error('FATAL: database startup check failed', err);
  process.exit(1);
});

module.exports = app;
