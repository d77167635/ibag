import { useState, type ReactNode } from "react";

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
];

const intelligenceNav: IrisJourneySurface[] = [
  { page: "iris/intelligence", label: "IRIS Intelligence", description: "Educational hierarchy" },
];

const journey = [
  { page: "iris", label: "Life" },
  { page: "iris/behavior", label: "Change" },
  { page: "iris/reasoning", label: "Understand" },
  { page: "iris/evidence", label: "Verify" },
  { page: "iris/intelligence", label: "Explore Intelligence" },
  { page: "iris/simulation", label: "Scenario" },
  { page: "iris/decisions", label: "Decide" },
  { page: "iris/action", label: "Action" },
  { page: "iris/outcomes", label: "Outcome" },
];

function IrisAssistant({ page, go }: { page: string; go: (page: string) => void }) {
  const [open, setOpen] = useState(false);
  const isIntelligence = page === "iris/intelligence";
  const prompts = isIntelligence
    ? [
        { label: "Explain this", action: () => setOpen(true) },
        { label: "How the hierarchy works", action: () => setOpen(true) },
        { label: "Explore Intelligence", action: () => go("iris/intelligence") },
      ]
    : [
        { label: "Explain my reports", action: () => go("iris/catalog") },
        { label: "Show me the evidence", action: () => go("iris/evidence") },
        { label: "Help me understand", action: () => go("iris/reasoning") },
      ];

  return (
    <aside className={`iris-assistant ${open ? "open" : ""}`} aria-label="IRIS assistant">
      {open && (
        <div className="iris-assistant-card" role="dialog" aria-label="IRIS assistant help">
          <div className="iris-assistant-card-head">
            <div><strong>IRIS</strong><span>{isIntelligence ? "Intelligence guide" : "Your financial-life guide"}</span></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close IRIS assistant">×</button>
          </div>
          <p>{isIntelligence
            ? "I’m here to explain how IRIS observes, connects, reasons, and builds intelligence. This educational experience does not display your financial data."
            : "I’m here to help you understand what you are seeing, move through your reports, verify evidence, and make sense of your financial life."
          }</p>
          <div className="iris-assistant-actions">
            {prompts.map((prompt) => <button key={prompt.label} type="button" onClick={prompt.action}>{prompt.label}</button>)}
          </div>
        </div>
      )}
      <button className="iris-assistant-launcher" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open IRIS assistant">
        <span className="iris-assistant-orb" aria-hidden="true">I</span>
        <span><strong>IRIS</strong><small>HELP &amp; ASSIST</small></span>
      </button>
    </aside>
  );
}

export function IrisExperienceShell({ page, go, children }: Props) {
  const active = [...financialNav, ...intelligenceNav].find((item) => item.page === page)?.page ?? "iris";
  return (
    <div className="iris-experience-shell">
      <header className="ies-topbar">
        <button className="ies-brand" type="button" onClick={() => go("iris")} aria-label="Go to your IRIS financial life">
          <span className="ies-brand-mark" aria-hidden="true">I</span>
          <span><strong>IRIS</strong><small>RELATIONAL FINANCIAL INTELLIGENCE</small></span>
        </button>
        <div className="ies-experiences">
          <section className="ies-experience-group" aria-label="Financial Life experience">
            <span>FINANCIAL LIFE · RESULTS</span>
            <nav className="ies-nav" aria-label="Financial Life">
              {financialNav.map((item) => <button key={item.page} className={active === item.page ? "active" : ""} type="button" onClick={() => go(item.page)} aria-current={active === item.page ? "page" : undefined}><strong>{item.label}</strong><span>{item.description}</span></button>)}
            </nav>
          </section>
          <section className="ies-experience-group ies-intelligence-group" aria-label="IRIS Intelligence educational experience">
            <span>IRIS INTELLIGENCE · EDUCATION</span>
            <nav className="ies-nav" aria-label="IRIS Intelligence">
              {intelligenceNav.map((item) => <button key={item.page} className={active === item.page ? "active" : ""} type="button" onClick={() => go(item.page)} aria-current={active === item.page ? "page" : undefined}><strong>{item.label}</strong><span>{item.description}</span></button>)}
            </nav>
          </section>
        </div>
        <div className="ies-top-actions">
          <button type="button" onClick={() => go("iris/evidence")}>Evidence</button>
          <button type="button" onClick={() => go("iris/reasoning")}>Ask / Understand</button>
          <button className="ies-connect" type="button" onClick={() => go("iris/connect")}>Connect evidence</button>
        </div>
      </header>
      <div className="ies-journey" aria-label="IRIS financial-life journey">
        <span className="ies-journey-label">FINANCIAL LIFE JOURNEY</span>
        {journey.map((item, index) => <span key={item.page} className={page === item.page ? "active" : ""}><button type="button" onClick={() => go(item.page)} aria-current={page === item.page ? "step" : undefined}>{item.label}</button>{index < journey.length - 1 && <i aria-hidden="true">→</i>}</span>)}
      </div>
      <main className="ies-content">{children}</main>
      <IrisAssistant page={page} go={go} />
    </div>
  );
}
