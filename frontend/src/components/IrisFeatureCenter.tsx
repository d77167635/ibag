import { useState } from "react";
import "../styles/iris-feature.css";

type Feature = {
  enabled: boolean;
  label: string;
  group?: string;
  description?: string;
  version?: string;
  capabilityId?: string;
  depth?: "core" | "advanced" | "frontier" | string;
  prerequisites?: string[];
  requiredEvidence?: string[];
  requiredAnalysisIds?: string[];
  intelligenceOutputs?: string[];
  uiSurfaces?: string[];
  educationSurfaces?: string[];
  interactionModes?: string[];
  evidencePolicy?: string;
};

const title = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const list = (values?: string[]) => (values?.length ? values.map(title).join(" · ") : "—");

export function IrisFeatureCenter({
  features,
  onToggle,
  onOpen,
}: {
  features: Record<string, Feature> | null;
  onToggle: (key: string, enabled: boolean) => Promise<void>;
  onOpen: (key: string) => void;
}) {
  const [group, setGroup] = useState("All");
  const entries = Object.entries(features ?? {});
  const groups = ["All", ...Array.from(new Set(entries.map(([, feature]) => feature.group ?? "Iris")))];
  const visible = group === "All" ? entries : entries.filter(([, feature]) => (feature.group ?? "Iris") === group);
  const activeCount = entries.filter(([, feature]) => feature.enabled).length;

  return (
    <section className="iris-shell-page">
      <div className="iris-page-intro">
        <div>
          <span className="iris-kicker">IRIS INTELLIGENCE SYSTEM</span>
          <h1>Iris Features</h1>
          <p>Every registered Iris capability is independently controllable. Turning a feature on or off changes the intelligence experience, never the underlying provider evidence.</p>
        </div>
        <div className="iris-feature-count">
          <strong>{activeCount}</strong>
          <span>active</span>
          <small>of {entries.length} registered</small>
        </div>
      </div>

      <div className="iris-filter-row">
        {groups.map((item) => (
          <button key={item} className={group === item ? "selected" : ""} onClick={() => setGroup(item)}>
            {title(item)}
          </button>
        ))}
      </div>

      <div className="iris-feature-grid">
        {visible.map(([key, feature]) => (
          <article className={`iris-feature-tile ${feature.enabled ? "enabled" : "disabled"}`} key={key}>
            <div className="iris-feature-tile-top">
              <span className="iris-feature-symbol">✦</span>
              <span className={`iris-toggle-state ${feature.enabled ? "on" : "off"}`}>{feature.enabled ? "Active" : "Off"}</span>
            </div>
            <h2>{feature.label}</h2>
            <p>{feature.description ?? "Iris intelligence capability."}</p>

            <div className="iris-feature-depth">
              <span>Registry metadata</span>
              <div>
                <i>Depth: {title(feature.depth ?? "unknown")}</i>
                <i>Family: {title(feature.group ?? "iris")}</i>
                <i>Version: {feature.version ?? "—"}</i>
              </div>
            </div>

            <div className="iris-feature-evidence">
              <span>Evidence requirements</span>
              <p>{list(feature.requiredEvidence)}</p>
            </div>

            <div className="iris-feature-evidence">
              <span>Prerequisites</span>
              <p>{list(feature.prerequisites)}</p>
            </div>

            <div className="iris-feature-evidence">
              <span>Education & interaction</span>
              <p>{list(feature.educationSurfaces)} · {list(feature.interactionModes)}</p>
            </div>

            <div className="iris-feature-actions">
              <button onClick={() => onOpen(key)}>Open feature <span>→</span></button>
              <button
                className="iris-switch"
                aria-label={`${feature.enabled ? "Disable" : "Enable"} ${feature.label}`}
                onClick={() => void onToggle(key, !feature.enabled)}
              >
                <span className={feature.enabled ? "thumb on" : "thumb"} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
