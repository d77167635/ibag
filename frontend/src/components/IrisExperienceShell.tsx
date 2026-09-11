import type { ReactNode } from "react";

export type IrisJourneySurface = { page: string; label: string; description: string };

type Props = { page: string; go: (page: string) => void; children: ReactNode };

const primary: IrisJourneySurface[] = [
  { page: "iris", label: "My Financial Life", description: "Your observed financial world" },
  { page: "iris/behavior", label: "What Changed", description: "Movement, patterns and signals" },
  { page: "iris/reasoning", label: "Understand", description: "Relationships and explanations" },
  { page: "iris/intelligence", label: "Intelligence", description: "The recursive graph" },
  { page: "iris/evidence", label: "Evidence", description: "How Iris knows" },
  { page: "iris/catalog", label: "Reports", description: "User-controlled publications" },
  { page: "iris/simulation", label: "Scenarios", description: "Possible futures" },
  { page: "iris/decisions", label: "Decisions", description: "Choices and tradeoffs" },
];

const journey = [
  { page: "iris", label: "Life" },
  { page: "iris/behavior", label: "Change" },
  { page: "iris/reasoning", label: "Understand" },
  { page: "iris/evidence", label: "Verify" },
  { page: "iris/intelligence", label: "Explore" },
  { page: "iris/simulation", label: "Scenario" },
  { page: "iris/decisions", label: "Decide" },
  { page: "iris/action", label: "Action" },
  { page: "iris/outcomes", label: "Outcome" },
];

export function IrisExperienceShell({ page, go, children }: Props) {
  const active = primary.find((item) => item.page === page)?.page ?? (page === "iris/catalog" ? "iris/catalog" : "iris");
  return (
    <div className="iris-experience-shell">
      <header className="ies-topbar">
        <button className="ies-brand" type="button" onClick={() => go("iris")} aria-label="Go to your IRIS financial life">
          <span className="ies-brand-mark" aria-hidden="true">I</span>
          <span><strong>IRIS</strong><small>RELATIONAL FINANCIAL INTELLIGENCE</small></span>
        </button>
        <nav className="ies-nav" aria-label="Your financial life">
          {primary.map((item) => <button key={item.page} className={active === item.page ? "active" : ""} type="button" onClick={() => go(item.page)} aria-current={active === item.page ? "page" : undefined}><strong>{item.label}</strong><span>{item.description}</span></button>)}
        </nav>
        <div className="ies-top-actions">
          <button type="button" onClick={() => go("iris/evidence")}>Evidence</button>
          <button type="button" onClick={() => go("iris/reasoning")}>Ask / Understand</button>
          <button className="ies-connect" type="button" onClick={() => go("iris/connect")}>Connect evidence</button>
        </div>
      </header>
      <div className="ies-journey" aria-label="IRIS journey">
        <span className="ies-journey-label">IRIS JOURNEY</span>
        {journey.map((item, index) => <span key={item.page} className={page === item.page ? "active" : ""}><button type="button" onClick={() => go(item.page)} aria-current={page === item.page ? "step" : undefined}>{item.label}</button>{index < journey.length - 1 && <i aria-hidden="true">→</i>}</span>)}
      </div>
      <main className="ies-content">{children}</main>
    </div>
  );
}
