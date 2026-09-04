import { useState } from "react";

interface Subdomain {
  label: string;
  amount: number;
}

interface Domain {
  key: string;
  label: string;
  amount: number;
  pctOfTotal: number;
  subdomains: Subdomain[];
}

const DOMAIN_COLORS: Record<string, string> = {
  transfers: "#6b7a8f",
  debt_and_fees: "#a8455c",
  housing: "#b98544",
  daily_living: "#5c8a6b",
  transportation_travel: "#3f8a8c",
  entertainment: "#7d5ba6",
  services_civic: "#8a7c5c",
  income: "#453868",
  uncategorized: "#a3a3a3",
};

function colorFor(key: string) {
  return DOMAIN_COLORS[key] ?? "#8890a0";
}

function fmt(n: number): string {
  return Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DomainHierarchy({ domains }: { domains: Domain[] }) {
  const [expanded, setExpanded] = useState<string | null>(domains[0]?.key ?? null);

  if (domains.length === 0) return null;

  return (
    <div className="hierarchy">
      <div className="hierarchy-ring-row">
        {domains.map((d) => (
          <div
            key={d.key}
            className="hierarchy-segment"
            style={{ width: `${Math.max(d.pctOfTotal, 3)}%`, background: colorFor(d.key) }}
            title={`${d.label}: $${fmt(d.amount)}`}
          />
        ))}
      </div>

      <div className="hierarchy-list">
        {domains.map((d) => {
          const isOpen = expanded === d.key;
          return (
            <div className="hierarchy-domain" key={d.key}>
              <button
                className="hierarchy-domain-head"
                onClick={() => setExpanded(isOpen ? null : d.key)}
                aria-expanded={isOpen}
              >
                <span className="hierarchy-dot" style={{ background: colorFor(d.key) }} />
                <span className="hierarchy-domain-label">{d.label}</span>
                <span className="hierarchy-domain-pct">{d.pctOfTotal.toFixed(0)}%</span>
                <span className="hierarchy-domain-amount">${fmt(d.amount)}</span>
                <span className={`hierarchy-chevron${isOpen ? " open" : ""}`}>⌄</span>
              </button>
              {isOpen && (
                <div className="hierarchy-subdomains">
                  {d.subdomains.map((s) => (
                    <div className="hierarchy-subdomain-row" key={s.label}>
                      <span className="hierarchy-subdomain-label">{s.label}</span>
                      <span className="hierarchy-subdomain-track">
                        <span
                          className="hierarchy-subdomain-fill"
                          style={{
                            width: `${Math.min(100, (s.amount / d.amount) * 100)}%`,
                            background: colorFor(d.key),
                          }}
                        />
                      </span>
                      <span className="hierarchy-subdomain-amount">${fmt(s.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
