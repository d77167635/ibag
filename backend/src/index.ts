import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { linkRouter } from "./routes/link.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { featuresRouter } from "./routes/features.js";

const app = express();

if (env.corsAllowedOrigins.length === 0) {
  console.warn("CORS_ALLOWED_ORIGINS is not set — all cross-origin requests will be blocked.");
}
app.use(
  cors({
    origin: env.corsAllowedOrigins,
  })
);

// The `verify` callback captures the exact raw bytes of every request body
// before JSON parsing — needed by the webhook route to check Plaid's
// request_body_sha256 claim against what was actually received. Cheap for
// the handful of small JSON bodies this API handles.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);

// Every request logged with method/path/status/duration — without this,
// a 401 or CORS-blocked request leaves zero trace, indistinguishable from
// the request never having been sent at all. That gap is what made an
// earlier debugging session take much longer than it should have.
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(linkRouter);
app.use(webhooksRouter);
app.use(dashboardRouter);
app.use(featuresRouter);

app.listen(env.port, () => {
  console.log(`Iris backend listening on :${env.port} (${env.nodeEnv}, Plaid env: ${env.plaidEnv})`);
});
