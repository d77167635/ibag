import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { linkRouter } from "./routes/link.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { dashboardRouter } from "./routes/dashboard.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(linkRouter);
app.use(webhooksRouter);
app.use(dashboardRouter);

app.listen(env.port, () => {
  console.log(`Iris backend listening on :${env.port} (${env.nodeEnv}, Plaid env: ${env.plaidEnv})`);
});
