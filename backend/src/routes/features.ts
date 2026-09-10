import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getFeatureFlags, setFeatureFlag, FEATURE_REGISTRY, type FeatureKey } from "../services/features.js";

export const featuresRouter = Router();

featuresRouter.get("/features", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const flags = await getFeatureFlags(req.userId!);
    const withMetadata = Object.fromEntries(
      Object.entries(flags).map(([key, enabled]) => {
        const feature = FEATURE_REGISTRY[key];
        return [key, {
          enabled,
          label: feature.name,
          group: feature.family,
          description: feature.description,
          version: feature.version,
          capabilityId: feature.capabilityId,
          depth: feature.depth,
          prerequisites: feature.prerequisites,
          requiredEvidence: feature.requiredEvidence,
          requiredAnalysisIds: feature.requiredAnalysisIds,
          intelligenceOutputs: feature.intelligenceOutputs,
          uiSurfaces: feature.uiSurfaces,
          educationSurfaces: feature.educationSurfaces,
          interactionModes: feature.interactionModes,
          evidencePolicy: feature.evidencePolicy,
        }];
      }),
    );
    res.json(withMetadata);
  } catch (error) {
    console.error("features read error:", error);
    res.status(500).json({ error: "Unable to load Iris feature registry." });
  }
});

featuresRouter.post("/features/:key/toggle", requireAuth, async (req: AuthedRequest, res) => {
  const key = req.params.key as FeatureKey;
  const { enabled } = req.body as { enabled?: boolean };
  if (!(key in FEATURE_REGISTRY)) return res.status(404).json({ error: `Unknown Iris feature: ${key}` });
  if (typeof enabled !== "boolean") return res.status(400).json({ error: "Body must include boolean `enabled`" });

  try {
    await setFeatureFlag(req.userId!, key, enabled);
    res.json({ key, enabled, registry_version: "IRIS_FEATURE_REGISTRY_V2" });
  } catch (error) {
    console.error("feature toggle error:", error);
    res.status(500).json({ error: "Unable to update Iris feature preference." });
  }
});
