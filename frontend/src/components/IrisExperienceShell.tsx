import type { ReactNode } from "react";

export type IrisJourneySurface = {
  page: string;
  label: string;
  description: string;
};

type Props = {
  page: string;
  go: (page: string) => void;
  children: ReactNode;
};

const primary: IrisJourneySurface[] = [
  { page: "iris", label: "IRIS", description: "What matters now" },
  { page: "iris/state", label: "My Financial Life", description: "Connected financial state" },
  { page: "iris/behavior", label: "What Changed", description: "Supported changes and patterns" },
  { page: "iris/reasoning", label: "Understand", description: "Why Iris says it" },
  { page: "iris/intelligence", label: "Intelligence", description: "Recursive relationships" },
  { page: "iris/catalog", label: "Reports", description: "User-controlled products" },
  { page: "iris/decisions", label: "Decisions", description: "Options and tradeoffs" },
  { page: "iris/evidence", label: "Evidence", description: "How Iris knows" },
];

const journey = [
  { page: "iris", label: "What matters" },
  { page: "iris/behavior", label: "What changed" },
  { page: "iris/reasoning", label: "Understand" },
  { page: "iris/evidence", label: "Verify" },
  { page: "iris/intelligence", label: "Explore" },
  { page: "iris/simulation", label: "Scenario" },
  { page: "iris/decisions", label: "Decide" },
];

export function IrisExperienceShell({ page, go, children }: Props) {
  const active = primary.find((item) => item.page === page)?.page ?? (page === "iris/catalog" ? "iris/catalog" : "iris");

  return (
    <div className="iris-experience-shell">
      <aside className="ies-sidebar" aria-label="IRIS navigation">
        <button className="ies-brand" type="button" onClick={() => go("iris")} aria-label="Go to IRIS home">
          <span className="ies-brand-mark" aria-hidden="true">I</span>
          <span><strong>IRIS</strong><small>RELATIONAL FINANCIAL INTELLIGENCE</small></span>
        </button>
        <div className="ies-nav-label">YOUR IRIS</div>
        <nav className="ies-nav">
          {primary.map((item) => (
            <button key={item.page} className={active === item.page ? "active" : ""} type="button" onClick={() => go(item.page)} aria-current={active === item.page ? "page" : undefined}>
              <strong>{item.label}</strong><span>{item.description}</span>
            </button>
          ))}
        </nav>
        <div className="ies-side-note">
          <span>TRUTH FIRST</span>
          <p>Observed, derived, hypothetical and unknown states stay distinct.</p>
        </div>
      </aside>

      <div className="ies-main">
        <header className="ies-topbar">
          <div className="ies-context">
            <span>IRIS</span>
            <strong>{primary.find((item) => item.page === page)?.label ?? (page === "iris/catalog" ? "Reports" : "IRIS")}</strong>
          </div>
          <div className="ies-top-actions">
            <button type="button" onClick={() => go("iris/evidence")}>Evidence</button>
            <button type="button" onClick={() => go("iris/reasoning")}>Ask / Understand</button>
            <button className="ies-connect" type="button" onClick={() => go("iris")}>Connect evidence</button>
          </div>
        </header>

        <div className="ies-journey" aria-label="IRIS journey">
          <span className="ies-journey-label">JOURNEY</span>
          {journey.map((item, index) => (
            <span key={item.page} className={page === item.page ? "active" : ""}>
              <button type="button" onClick={() => go(item.page)} aria-current={page === item.page ? "step" : undefined}>{item.label}</button>{index < journey.length - 1 && <i aria-hidden="true">→</i>}
            </span>
          ))}
        </div>

        <main className="ies-content">{children}</main>
      </div>
    </div>
  );
}
