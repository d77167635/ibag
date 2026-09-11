import { type ReactNode } from "react";
import { IrisAssistant } from "./IrisAssistant";

export type IrisJourneySurface = { page: string; label: string; description: string };
type Props = { page: string; go: (page: string) => void; children: ReactNode };

const financialNav: IrisJourneySurface[] = [
  { page: "iris", label: "My Financial Life", description: "Your observed financial world" },
  { page: "iris/behavior", label: "What Changed", description: "Movement, patterns and signals" },
  { page: "iris/reasoning", label: "Understand", description: "Relationships and explanations" },
  { page: "iris/evidence", label: "Evidence", description: "How Iris knows" },
  { page: "iris/catalog", label: "Reports", description: "Your report inventory" },
  { page: "iris/simulation", label: "Scenarios", description: "Possible futures" },
  { page: "iris/decisions", label: "Decisions", description: "Choices and tradeoffs" },
  { page: "iris/action", label: "Action", description: "Action-oriented results" },
  { page: "iris/outcomes", label: "Outcomes", description: "What happened and what was learned" },
  { page: "iris/connect", label: "Connect", description: "Build governed evidence" },
];

const intelligenceNav: IrisJourneySurface[] = [
  { page: "iris/intelligence", label: "Overview", description: "The IRIS intelligence system" },
  { page: "iris/intelligence/hierarchy", label: "Hierarchy", description: "Domains and recursive depth" },
  { page: "iris/intelligence/evidence", label: "Evidence → Intelligence", description: "How evidence becomes intelligence" },
  { page: "iris/intelligence/graph", label: "Graph", description: "Nodes, edges and relationships" },
  { page: "iris/intelligence/forward", label: "Forward Reasoning", description: "Observation to conclusion" },
  { page: "iris/intelligence/reverse", label: "Reverse Lineage", description: "Conclusion back to evidence" },
  { page: "iris/intelligence/recursive", label: "Recursive Intelligence", description: "Intelligence becoming upstream" },
  { page: "iris/intelligence/relationships", label: "Relationships", description: "Cross-domain composition" },
  { page: "iris/intelligence/uncertainty", label: "Uncertainty", description: "What IRIS can and cannot know" },
  { page: "iris/intelligence/scenarios", label: "Scenarios", description: "Prediction and counterfactuals" },
  { page: "iris/intelligence/certification", label: "Certification", description: "Proof before publication" },
  { page: "iris/intelligence/higher-order", label: "Higher-Order", description: "Synthesis without a ceiling" },
];

const journey = [
  { page: "iris", label: "Life" },
  { page: "iris/behavior", label: "Change" },
  { page: "iris/reasoning", label: "Understand" },
  { page: "iris/evidence", label: "Verify" },
  { page: "iris/catalog", label: "Reports" },
  { page: "iris/simulation", label: "Scenario" },
  { page: "iris/decisions", label: "Decide" },
  { page: "iris/action", label: "Action" },
  { page: "iris/outcomes", label: "Outcome" },
];

export function IrisExperienceShell({ page, go, children }: Props) {
  const active = [...financialNav, ...intelligenceNav].find((item) => item.page === page)?.page ?? "iris";
  const intelligence = page === "iris/intelligence" || page.startsWith("iris/intelligence/");
  return <div className="iris-experience-shell">
    <header className="ies-topbar">
      <button className="ies-brand" type="button" onClick={() => go("iris")} aria-label="Go to your IRIS financial life"><span className="ies-brand-mark" aria-hidden="true">I</span><span><strong>IRIS</strong><small>RELATIONAL FINANCIAL INTELLIGENCE</small></span></button>
      <div className="ies-experiences">
        <section className="ies-experience-group" aria-label="Financial Life experience"><span>FINANCIAL LIFE · RESULTS</span><nav className="ies-nav" aria-label="Financial Life">{financialNav.map((item) => <button key={item.page} className={active === item.page ? "active" : ""} type="button" onClick={() => go(item.page)} aria-current={active === item.page ? "page" : undefined}><strong>{item.label}</strong><span>{item.description}</span></button>)}</nav></section>
        <section className="ies-experience-group ies-intelligence-group" aria-label="IRIS Intelligence educational experience"><span>IRIS INTELLIGENCE · EDUCATION</span><nav className="ies-nav" aria-label="IRIS Intelligence">{intelligenceNav.map((item) => <button key={item.page} className={active === item.page ? "active" : ""} type="button" onClick={() => go(item.page)} aria-current={active === item.page ? "page" : undefined}><strong>{item.label}</strong><span>{item.description}</span></button>)}</nav></section>
      </div>
      <div className="ies-top-actions"><button type="button" onClick={() => go("iris/evidence")}>Evidence</button><button type="button" onClick={() => go("iris/reasoning")}>Ask / Understand</button><button className="ies-connect" type="button" onClick={() => go("iris/connect")}>Connect evidence</button></div>
    </header>
    <div className="ies-journey" aria-label="IRIS financial-life journey"><span className="ies-journey-label">FINANCIAL LIFE JOURNEY · PRIORITY 1</span>{journey.map((item, index) => <span key={item.page} className={page === item.page ? "active" : ""}><button type="button" onClick={() => go(item.page)} aria-current={page === item.page ? "step" : undefined}>{item.label}</button>{index < journey.length - 1 && <i aria-hidden="true">→</i>}</span>)}</div>
    <main className="ies-content">{children}</main>
    <IrisAssistant mode={intelligence ? "intelligence" : "financial"} />
  </div>;
}