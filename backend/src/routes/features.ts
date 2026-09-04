import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getFeatureFlags, setFeatureFlag, FEATURE_REGISTRY, type FeatureKey } from "../services/features.js";

export const featuresRouter = Router();

featuresRouter.get("/features", requireAuth, async (req: AuthedRequest, res) => {
  const flags = await getFeatureFlags(req.userId!);
  const withMetadata = Object.fromEntries(
    Object.entries(flags).map(([key, enabled]) => [key, {
      enabled,
      label: FEATURE_REGISTRY[key as FeatureKey].label,
      group: FEATURE_REGISTRY[key as FeatureKey].group,
    }])
  );
  res.json(withMetadata);
});

featuresRouter.post("/features/:key/toggle", requireAuth, async (req: AuthedRequest, res) => {
  const key = req.params.key as FeatureKey;
  const { enabled } = req.body as { enabled?: boolean };
  if (!(key in FEATURE_REGISTRY)) return res.status(404).json({ error: `Unknown feature: ${key}` });
  if (typeof enabled !== "boolean") return res.status(400).json({ error: "Body must include boolean `enabled`" });
  await setFeatureFlag(req.userId!, key, enabled);
  res.json({ key, enabled });
});
