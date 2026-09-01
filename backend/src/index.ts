import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { linkRouter } from "./routes/link.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { dashboardRouter } from "./routes/dashboard.js";

const app = express();

app.use(cors());
app.use(express.json());

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

app.listen(env.port, () => {
  console.log(`Iris backend listening on :${env.port} (${env.nodeEnv}, Plaid env: ${env.plaidEnv})`);
});
