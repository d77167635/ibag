import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { linkRouter } from "./routes/link.js";
import { webhooksRouter, recoverPendingWebhookEvents } from "./routes/webhooks.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { sourceTruthRouter } from "./routes/sourceTruth.js";
import { plaidKnowledgeRouter } from "./routes/plaidKnowledge.js";
import { irisPlaidKnowledgeRouter } from "./routes/irisPlaidKnowledge.js";
import { plaidSelectionRouter } from "./routes/plaidSelection.js";
import { plaidSurfaceRouter } from "./routes/plaidSurface.js";
import { plaidCapabilitiesRouter } from "./routes/plaidCapabilities.js";
import { featuresRouter } from "./routes/features.js";
import { irisRouter } from "./routes/iris.js";
import { goalsRouter } from "./routes/goals.js";
import { migrateLegacyPlaidAccessTokens } from "./services/tokenStore.js";

const app = express();
if (env.corsAllowedOrigins.length === 0) console.warn("CORS_ALLOWED_ORIGINS is not set — all cross-origin requests will be blocked.");
app.use(cors({ origin: env.corsAllowedOrigins }));
app.use(express.json({ verify: (req, _res, buf) => { (req as express.Request & { rawBody?: Buffer }).rawBody = buf; } }));
app.use((req, res, next) => { const start = Date.now(); res.on("finish", () => console.log(`${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`)); next(); });
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(linkRouter); app.use(webhooksRouter); app.use(dashboardRouter); app.use(sourceTruthRouter); app.use(plaidKnowledgeRouter); app.use(irisPlaidKnowledgeRouter); app.use(plaidSelectionRouter); app.use(plaidSurfaceRouter); app.use(plaidCapabilitiesRouter); app.use(featuresRouter); app.use(irisRouter); app.use(goalsRouter);
async function start() { const migrated = await migrateLegacyPlaidAccessTokens(); if (migrated > 0) console.log(`Migrated ${migrated} legacy Plaid access token(s) to encrypted storage.`); await recoverPendingWebhookEvents(); app.listen(env.port, () => console.log(`Iris backend listening on :${env.port} (${env.nodeEnv}, Plaid env: ${env.plaidEnv})`)); }
start().catch((err) => { console.error("Backend startup failed", err); process.exit(1); });
