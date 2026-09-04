import { useEffect, useState } from "react";
import { api } from "../api/backend";
import { supabase } from "../api/supabase";
import { PlaidLinkButton } from "./PlaidLink";
import { IrisMark } from "./IrisMark";
import { BalanceTrendChart } from "./BalanceTrendChart";
import { DomainHierarchy } from "./DomainHierarchy";

interface Account {
  id: string;
  name: string;
  mask: string | null;
  type: string | null;
  subtype: string | null;
  roundup_enabled: boolean;
  card_roundup_ledger: { accrued_unswept: number; lifetime_roundup_total: number }[] | null;
}

interface Transaction {
  id: string;
  merchant_name: string | null;
  amount: number;
  posted_date: string;
  plaid_category_primary: string | null;
  pending: boolean;
  merchants: { canonical_name: string } | null;
  subdomains: { label: string; domains: { key: string; label: string } | null } | null;
}

interface Overview {
  accounts: Account[];
  recent_transactions: Transaction[];
  ibag: { projected_balance: number };
}

interface DebtCostIntelligence {
  totalRevolvingBalance: number | null;
  weightedAvgApr: number | null;
  estimatedMonthlyInterestCost: number | null;
  minimumPaymentTotal: number | null;
  accountsWithKnownApr: number;
  accountsWithoutAprData: number;
  evidence: "calculated" | "insufficient_evidence";
  basis: string;
}

interface CategoryDrift {
  subdomainKey: string;
  subdomainLabel: string;
  recentDailyAvg: number;
  baselineDailyAvg: number;
  deviationPct: number;
  significant: boolean;
  evidence: "calculated" | "insufficient_evidence";
  baselineTransactionCount: number;
}

interface RiskItem {
  key: string;
  severity: "low" | "medium" | "high";
  evidence: string;
  statement: string;
  supportingMetrics: Record<string, number | string | null>;
}

interface OpportunityItem {
  key: string;
  evidence: string;
  statement: string;
  supportingMetrics: Record<string, number | string | null>;
}

interface FinancialReasoning {
  risks: RiskItem[];
  opportunities: OpportunityItem[];
  relationalChain: string[];
  unresolvedQuestions: string[];
  priorityFocus: { key: string; reason: string } | null;
  generatedAt: string;
}

interface FeatureFlags {
  roundup: { enabled: boolean; label: string };
  anomaly_detection: { enabled: boolean; label: string };
  category_drift: { enabled: boolean; label: string };
  debt_cost_intelligence: { enabled: boolean; label: string };
  relational_reasoning: { enabled: boolean; label: string };
}

interface Intelligence {
  narrative: string;
  net_worth: { liquid_assets: number | null; as_of: string | null };
  debt_health: {
    revolving_debt: number | null;
    credit_utilization: number | null;
    change_pct_30d: number | null;
    interest_cost_attribution: DebtCostIntelligence | null;
    as_of: string | null;
  };
  cash_flow_safety: {
    safeToSpend: number | null;
    currentAvailable: number | null;
    essentialBillsTotal: number;
    upcomingBills: { merchant: string; amount: number; expectedDate: string }[];
    billCollisions: { window_start: string; bills: string[] }[];
    horizonDays: number;
  };
  roundup_projection: { dailyRate: number | null; projected: number | null; basisDays: number; projectDays?: number };
  cash_flow: { inflow: number | null; outflow: number | null; net: number | null; netChangePct: number | null; windowDays: number };
  spending_by_domain: { key: string; label: string; amount: number; changePct: number | null }[];
  spending_hierarchy: { key: string; label: string; amount: number; pctOfTotal: number; subdomains: { label: string; amount: number }[] }[];
  balance_history: { date: string; liquidAssets: number }[];
  forward_projection: { series: { date: string; balance: number; event: string | null }[]; basis: string };
  anomalies: { merchant: string; amount: number; typicalAmount: number; date: string; pctAboveTypical: number }[];
  category_drift: CategoryDrift[];
  reasoning: FinancialReasoning | null;
  feature_flags: Record<string, boolean>;
}

function formatType(subtype: string | null, type: string | null) {
  const raw = subtype ?? type ?? "account";
  return raw.replace(/_/g, " ");
}

// Every dollar figure in this component routes through here so
// amounts always carry thousands separators — $62,589.00, never
// $62589.00. Callers that need a sign prepend it themselves; this
// always returns the unsigned, comma-formatted magnitude.
function fmt(n: number): string {
  return Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function productLabel(p: string): string {
  const labels: Record<string, string> = {
    transactions: "Transactions",
    auth: "Auth",
    balance: "Balance",
    identity: "Identity",
    investments: "Investments",
    liabilities: "Liabilities",
    transfer: "Transfer",
    signal: "Signal",
  };
  return labels[p] ?? p;
}

type DashboardMode = "iris" | "plaid";

interface PlaidProducts {
  items: {
    institution_name: string | null;
    status: string;
    last_synced_at: string | null;
    billed_products: string[];
    available_products: string[];
  }[];
  products: { product: string; status?: "active" | "available" | "not_requested" | "not_connected" }[];
}

type Tab = "overview" | "spending" | "insights" | "bills" | "accounts" | "activity" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "spending", label: "Spending", icon: "◐" },
  { id: "insights", label: "Insights", icon: "✦" },
  { id: "bills", label: "Bills", icon: "◷" },
  { id: "accounts", label: "Cards", icon: "▭" },
  { id: "activity", label: "Activity", icon: "≡" },
];

function SkeletonBlock({ height = 80 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} />;
}

export function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [intelligence, setIntelligence] = useState<Intelligence | null>(null);
  const [features, setFeatures] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [mode, setMode] = useState<DashboardMode>("iris");
  const [plaidProducts, setPlaidProducts] = useState<PlaidProducts | null>(null);

  async function loadPlaidProducts() {
    try {
      const p = await api.getPlaidProducts();
      setPlaidProducts(p);
    } catch {
      setPlaidProducts(null);
    }
  }

  const [scenarioType, setScenarioType] = useState<"spending_change" | "bill_change" | "income_change">(
    "spending_change"
  );
  const [scenarioAmount, setScenarioAmount] = useState("");
  const [scenarioResult, setScenarioResult] = useState<any>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  async function runScenario() {
    const amount = Number(scenarioAmount);
    if (Number.isNaN(amount)) return;
    setScenarioLoading(true);
    try {
      const result = await api.runScenario(scenarioType, amount);
      setScenarioResult(result);
    } catch {
      setScenarioResult({ evidence: "insufficient_evidence", reason: "Scenario calculation failed." });
    } finally {
      setScenarioLoading(false);
    }
  }

  async function loadFeatures() {
    try {
      const f = await api.getFeatures();
      setFeatures(f);
    } catch {
      setFeatures(null);
    }
  }

  async function toggleFeature(key: string, enabled: boolean) {
    await api.toggleFeature(key, enabled);
    await loadFeatures();
    await refresh();
  }

  async function toggleAccountRoundup(accountId: string, enabled: boolean) {
    await api.toggleAccountRoundup(accountId, enabled);
    await refresh();
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOverview();
      setOverview(data);
      if (data.accounts.length > 0) {
        try {
          const intel = await api.getIntelligence();
          setIntelligence(intel);
        } catch {
          setIntelligence(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function resync() {
    setResyncing(true);
    try {
      await api.resync();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resync failed");
    } finally {
      setResyncing(false);
    }
  }

  useEffect(() => {
    refresh();
    loadFeatures();
    loadPlaidProducts();
  }, []);

  const header = (
    <header className="app-header">
      <div className="app-mark">
        <IrisMark size={22} color="#453868" />
        Iris
      </div>
      <div className="app-header-actions">
        {overview && overview.accounts.length > 0 && (
          <button className="btn-ghost" onClick={resync} disabled={resyncing}>
            {resyncing ? "Refreshing…" : "Refresh"}
          </button>
        )}
        {overview && <PlaidLinkButton onSuccess={refresh} />}
        {overview && overview.accounts.length > 0 && (
          <button className="btn-ghost" onClick={() => setTab("settings")} title="Settings">
            ⚙
          </button>
        )}
        <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app-container">
          {header}
          <SkeletonBlock height={110} />
          <div style={{ height: 16 }} />
          <SkeletonBlock height={200} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-shell">
        <div className="app-container">
          {header}
          <div className="banner banner-error">{error}</div>
        </div>
      </div>
    );
  }

  if (!overview) return null;

  const hasAccounts = overview.accounts.length > 0;
  const hasTransactions = overview.recent_transactions.length > 0;

  return (
    <div className="app-shell">
      <div className="app-container">
        {header}

        <section className="balance-card">
          <p className="balance-label">Available in your ibag</p>
          <p className="balance-figure">${fmt(overview.ibag.projected_balance)}</p>
          <p className="balance-note">
            This is a projection, not spendable funds — round-ups are simulated in Phase 1.
          </p>
        </section>

        {!hasAccounts && (
          <section className="section">
            <div className="empty-state">No cards connected yet — connect a card to see your data.</div>
          </section>
        )}

        {hasAccounts && (
          <div className="dashboard-mode-switch">
            <button
              className={`mode-button${mode === "iris" ? " active" : ""}`}
              onClick={() => setMode("iris")}
            >
              Iris Intelligence
            </button>
            <button
              className={`mode-button${mode === "plaid" ? " active" : ""}`}
              onClick={() => setMode("plaid")}
            >
              Plaid Products
            </button>
          </div>
        )}

        {hasAccounts && mode === "plaid" && (
          <section className="section">
            <div className="section-head">
              <h2>Plaid standard products</h2>
            </div>
            {!plaidProducts && <div className="empty-state">Unable to load Plaid product status.</div>}
            {plaidProducts && (
              <>
                <div className="product-grid">
                  {plaidProducts.products.map((p) => (
                    <div className="product-card" key={p.product}>
                      <span className="product-name">{productLabel(p.product)}</span>
                      <span className={`product-status product-status-${p.status}`}>
                        {(p.status ?? "unknown").replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="section-head" style={{ marginTop: 24 }}>
                  <h2>Connected institutions</h2>
                  <span className="section-count">{plaidProducts.items.length}</span>
                </div>
                <div className="account-list">
                  {plaidProducts.items.map((item, i) => (
                    <div className="account-row" key={i}>
                      <span className="account-name">
                        {item.institution_name ?? "Unknown institution"}
                        <span className="account-mask">{item.status}</span>
                      </span>
                      <span className="account-type">
                        {item.billed_products.length > 0
                          ? item.billed_products.map(productLabel).join(", ")
                          : "No active products"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {hasAccounts && mode === "iris" && tab === "overview" && intelligence && (
          <section className="section">
            {intelligence.narrative && (
              <div className="narrative">
                <span className="narrative-label">Insight</span>
                {intelligence.narrative}
              </div>
            )}

            {intelligence.spending_hierarchy.length > 0 && (
              <div className="hierarchy-teaser">
                <div className="hierarchy-ring-row">
                  {intelligence.spending_hierarchy.map((d) => (
                    <div
                      key={d.key}
                      className="hierarchy-segment"
                      style={{
                        width: `${Math.max(d.pctOfTotal, 3)}%`,
                        background:
                          {
                            transfers: "#6b7a8f",
                            debt_and_fees: "#a8455c",
                            housing: "#b98544",
                            daily_living: "#5c8a6b",
                            transportation_travel: "#3f8a8c",
                            entertainment: "#7d5ba6",
                            services_civic: "#8a7c5c",
                          }[d.key] ?? "#8890a0",
                      }}
                      title={`${d.label}: $${fmt(d.amount)}`}
                    />
                  ))}
                </div>
                <button className="hierarchy-teaser-link" onClick={() => setTab("spending")}>
                  Full spending breakdown by domain →
                </button>
              </div>
            )}

            {intelligence.balance_history.length > 1 && (
              <BalanceTrendChart data={intelligence.balance_history} />
            )}
            <div className="metric-grid">
              <div className="metric-card">
                <p className="metric-label">Safe-to-spend</p>
                <p className="metric-value">
                  {intelligence.cash_flow_safety.safeToSpend !== null
                    ? `$${fmt(intelligence.cash_flow_safety.safeToSpend)}`
                    : "—"}
                </p>
                {intelligence.cash_flow_safety.safeToSpend !== null && (
                  <p className="metric-note">
                    ${intelligence.cash_flow_safety.currentAvailable !== null
                      ? fmt(intelligence.cash_flow_safety.currentAvailable)
                      : "—"}{" "}
                    available minus $
                    {fmt(intelligence.cash_flow_safety.essentialBillsTotal)} in essential bills due within{" "}
                    {intelligence.cash_flow_safety.horizonDays} days.
                  </p>
                )}
              </div>
              <div className="metric-card">
                <p className="metric-label">Liquid assets</p>
                <p className="metric-value">
                  {intelligence.net_worth.liquid_assets !== null
                    ? `$${fmt(intelligence.net_worth.liquid_assets)}`
                    : "—"}
                </p>
                <p className="metric-note">Across connected checking &amp; savings accounts.</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Revolving debt</p>
                <p className="metric-value">
                  {intelligence.debt_health.revolving_debt !== null
                    ? `$${fmt(intelligence.debt_health.revolving_debt)}`
                    : "—"}
                </p>
                <p className="metric-note">
                  {intelligence.debt_health.credit_utilization !== null
                    ? `${(intelligence.debt_health.credit_utilization * 100).toFixed(0)}% average utilization`
                    : "Across connected credit accounts."}
                  {intelligence.debt_health.change_pct_30d !== null && (
                    <>
                      {" "}
                      ·{" "}
                      <span
                        className={`delta ${
                          intelligence.debt_health.change_pct_30d > 0 ? "delta-negative" : "delta-positive"
                        }`}
                      >
                        {intelligence.debt_health.change_pct_30d >= 0 ? "↑" : "↓"}
                        {Math.abs(intelligence.debt_health.change_pct_30d).toFixed(0)}% (30d)
                      </span>
                    </>
                  )}
                </p>
                {intelligence.debt_health.interest_cost_attribution?.evidence === "calculated" && (
                  <p className="metric-note">
                    ~${fmt(intelligence.debt_health.interest_cost_attribution.estimatedMonthlyInterestCost!)}/mo
                    interest at {intelligence.debt_health.interest_cost_attribution.weightedAvgApr!.toFixed(1)}%
                    APR
                  </p>
                )}
              </div>
              <div className="metric-card">
                <p className="metric-label">Round-up pace</p>
                <p className="metric-value">
                  {intelligence.roundup_projection.projected !== null
                    ? `$${fmt(intelligence.roundup_projection.projected)}`
                    : "—"}
                </p>
                <p className="metric-note">
                  {intelligence.roundup_projection.dailyRate !== null
                    ? `Trend projection over next ${intelligence.roundup_projection.projectDays} days, based on ${intelligence.roundup_projection.basisDays} days of transaction history.`
                    : "Not enough transaction history yet to project."}
                </p>
              </div>
            </div>

            {intelligence.cash_flow.net !== null && (
              <div className="cashflow-row">
                <div className="cashflow-item">
                  <p className="metric-label">{intelligence.cash_flow.windowDays}-day inflow</p>
                  <p className="cashflow-value positive">+${fmt(intelligence.cash_flow.inflow!)}</p>
                </div>
                <div className="cashflow-item">
                  <p className="metric-label">{intelligence.cash_flow.windowDays}-day outflow</p>
                  <p className="cashflow-value negative">-${fmt(intelligence.cash_flow.outflow!)}</p>
                </div>
                <div className="cashflow-item">
                  <p className="metric-label">Net cash movement</p>
                  <p className={`cashflow-value ${intelligence.cash_flow.net >= 0 ? "positive" : "negative"}`}>
                    {intelligence.cash_flow.net >= 0 ? "+" : "-"}${fmt(intelligence.cash_flow.net)}
                  </p>
                  {intelligence.cash_flow.netChangePct !== null && (
                    <p className="metric-note">
                      {intelligence.cash_flow.netChangePct >= 0 ? "↑" : "↓"}{" "}
                      {Math.abs(intelligence.cash_flow.netChangePct).toFixed(0)}% vs previous{" "}
                      {intelligence.cash_flow.windowDays} days
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {hasAccounts && mode === "iris" && tab === "spending" && intelligence && (
          <section className="section">
            <div className="section-head">
              <h2>Where money went</h2>
              <span className="section-count">last 30 days</span>
            </div>
            {intelligence.spending_hierarchy.length > 0 ? (
              <DomainHierarchy domains={intelligence.spending_hierarchy} />
            ) : (
              <div className="empty-state">Not enough spending activity yet to break down by category.</div>
            )}

            {intelligence.anomalies.length > 0 && (
              <div className="anomalies">
                <p className="metric-label" style={{ marginBottom: 8 }}>
                  Unusually large purchases
                </p>
                {intelligence.anomalies.map((a, i) => (
                  <div className="account-row" key={i}>
                    <span className="account-name">
                      {a.merchant} <span className="account-mask">{a.date}</span>
                    </span>
                    <span className="account-type anomaly-tag">
                      ${fmt(a.amount)} (typically ${fmt(a.typicalAmount)})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {hasAccounts && mode === "iris" && tab === "bills" && intelligence && (
          <section className="section">
            {intelligence.cash_flow_safety.billCollisions.length > 0 && (
              <div className="banner banner-error">
                {intelligence.cash_flow_safety.billCollisions.map((c) => (
                  <div key={c.window_start}>
                    Heads up — {c.bills.join(" and ")} are expected close together around {c.window_start}.
                  </div>
                ))}
              </div>
            )}

            {intelligence.cash_flow_safety.upcomingBills.length > 0 ? (
              <div className="upcoming-bills">
                <p className="metric-label" style={{ marginBottom: 8 }}>
                  Upcoming bills (detected from recurring activity)
                </p>
                {intelligence.cash_flow_safety.upcomingBills.map((b, i) => (
                  <div className="account-row" key={i}>
                    <span className="account-name">{b.merchant}</span>
                    <span className="account-type">
                      ${fmt(b.amount)} · {b.expectedDate}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No essential recurring bills detected yet.</div>
            )}

            {intelligence.forward_projection.series.filter((p) => p.event).length > 0 && (
              <div className="upcoming-bills">
                <p className="metric-label" style={{ marginBottom: 8 }}>
                  Projected checking balance (known essential bills only — not a full forecast)
                </p>
                <div className="account-list">
                  {intelligence.forward_projection.series
                    .filter((p) => p.event)
                    .map((p) => (
                      <div className="account-row" key={p.date}>
                        <span className="account-name">
                          {p.event} <span className="account-mask">{p.date}</span>
                        </span>
                        <span className="account-type">${fmt(p.balance)} balance after</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </section>
        )}

        {hasAccounts && mode === "iris" && tab === "accounts" && (
          <section className="section">
            <div className="section-head">
              <h2>Connected cards</h2>
              <span className="section-count">{overview.accounts.length}</span>
            </div>
            <div className="account-list">
              {overview.accounts.map((acct) => {
                const ledger = acct.card_roundup_ledger?.[0];
                return (
                  <div className="account-row" key={acct.id}>
                    <span className="account-name">
                      {acct.name}
                      {acct.mask && <span className="account-mask">••{acct.mask}</span>}
                    </span>
                    <span className="account-row-right">
                      {ledger && Number(ledger.lifetime_roundup_total) > 0 && (
                        <span className="account-roundup">
                          ${fmt(Number(ledger.lifetime_roundup_total))} round-ups
                        </span>
                      )}
                      <span className="account-type">{formatType(acct.subtype, acct.type)}</span>
                      <label className="toggle-switch" title="Round-up on this card">
                        <input
                          type="checkbox"
                          checked={acct.roundup_enabled}
                          onChange={(e) => toggleAccountRoundup(acct.id, e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {hasAccounts && mode === "iris" && tab === "insights" && intelligence && (
          <section className="section">
            <div className="scenario-block">
              <p className="metric-label" style={{ marginBottom: 8 }}>
                What if?
              </p>
              <div className="scenario-controls">
                <select
                  className="scenario-select"
                  value={scenarioType}
                  onChange={(e) => setScenarioType(e.target.value as typeof scenarioType)}
                >
                  <option value="spending_change">Spending changes by $</option>
                  <option value="bill_change">Essential bills change by $</option>
                  <option value="income_change">30-day inflow changes by %</option>
                </select>
                <input
                  className="scenario-input"
                  type="number"
                  placeholder={scenarioType === "income_change" ? "e.g. -10" : "e.g. -300"}
                  value={scenarioAmount}
                  onChange={(e) => setScenarioAmount(e.target.value)}
                />
                <button className="btn-accent" onClick={runScenario} disabled={scenarioLoading || !scenarioAmount}>
                  {scenarioLoading ? "…" : "Run"}
                </button>
              </div>
              {scenarioResult && scenarioResult.evidence === "insufficient_evidence" && (
                <p className="metric-note" style={{ marginTop: 8 }}>
                  {scenarioResult.reason}
                </p>
              )}
              {scenarioResult && scenarioResult.evidence === "calculated" && (
                <div className="scenario-result">
                  <div className="scenario-row">
                    <span>Safe-to-spend</span>
                    <span>
                      ${fmt(scenarioResult.baseline.safeToSpend)} → ${fmt(scenarioResult.scenario.safeToSpend)}{" "}
                      <span className={scenarioResult.delta.safeToSpend >= 0 ? "delta-positive" : "delta-negative"}>
                        ({scenarioResult.delta.safeToSpend >= 0 ? "+" : "-"}${fmt(scenarioResult.delta.safeToSpend)})
                      </span>
                    </span>
                  </div>
                  <div className="scenario-row">
                    <span>30-day cash flow net</span>
                    <span>
                      ${fmt(scenarioResult.baseline.cashFlowNet)} → ${fmt(scenarioResult.scenario.cashFlowNet)}{" "}
                      <span className={scenarioResult.delta.cashFlowNet >= 0 ? "delta-positive" : "delta-negative"}>
                        ({scenarioResult.delta.cashFlowNet >= 0 ? "+" : "-"}${fmt(scenarioResult.delta.cashFlowNet)})
                      </span>
                    </span>
                  </div>
                  <p className="scenario-assumption">{scenarioResult.assumption}</p>
                </div>
              )}
            </div>

            {!intelligence.reasoning ? (
              <div className="empty-state">
                Risk &amp; opportunity analysis is turned off.{" "}
                <button className="btn-link" onClick={() => setTab("settings")}>
                  Turn it on in Settings
                </button>
                .
              </div>
            ) : (
              <>
                {intelligence.reasoning.risks.length > 0 && (
                  <div className="insight-block">
                    <p className="metric-label" style={{ marginBottom: 8 }}>
                      Risks
                    </p>
                    {intelligence.reasoning.risks.map((r) => (
                      <div className={`insight-card severity-${r.severity}`} key={r.key}>
                        <span className="insight-severity">{r.severity}</span>
                        <p className="insight-statement">{r.statement}</p>
                      </div>
                    ))}
                  </div>
                )}

                {intelligence.reasoning.opportunities.length > 0 && (
                  <div className="insight-block">
                    <p className="metric-label" style={{ marginBottom: 8 }}>
                      Opportunities
                    </p>
                    {intelligence.reasoning.opportunities.map((o) => (
                      <div className="insight-card opportunity" key={o.key}>
                        <p className="insight-statement">{o.statement}</p>
                      </div>
                    ))}
                  </div>
                )}

                {intelligence.category_drift.filter((d) => d.significant).length > 0 && (
                  <div className="insight-block">
                    <p className="metric-label" style={{ marginBottom: 8 }}>
                      Spending pattern drift
                    </p>
                    {intelligence.category_drift
                      .filter((d) => d.significant)
                      .map((d) => (
                        <div className="account-row" key={d.subdomainKey}>
                          <span className="account-name">{d.subdomainLabel}</span>
                          <span className={`account-type ${d.deviationPct >= 0 ? "anomaly-tag" : ""}`}>
                            {d.deviationPct >= 0 ? "↑" : "↓"}
                            {Math.abs(d.deviationPct).toFixed(0)}% vs baseline
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                {intelligence.reasoning.relationalChain.length > 0 && (
                  <div className="insight-block">
                    <p className="metric-label" style={{ marginBottom: 8 }}>
                      How these connect
                    </p>
                    {intelligence.reasoning.relationalChain.map((c, i) => (
                      <p className="insight-chain-line" key={i}>
                        {c}
                      </p>
                    ))}
                  </div>
                )}

                {intelligence.reasoning.unresolvedQuestions.length > 0 && (
                  <div className="insight-block">
                    <p className="metric-label" style={{ marginBottom: 8 }}>
                      What we can't determine yet
                    </p>
                    {intelligence.reasoning.unresolvedQuestions.map((q, i) => (
                      <p className="insight-chain-line unresolved" key={i}>
                        {q}
                      </p>
                    ))}
                  </div>
                )}

                {intelligence.reasoning.risks.length === 0 &&
                  intelligence.reasoning.opportunities.length === 0 &&
                  intelligence.category_drift.filter((d) => d.significant).length === 0 && (
                    <div className="empty-state">
                      No risks, opportunities, or notable pattern drift detected yet.
                    </div>
                  )}
              </>
            )}
          </section>
        )}

        {hasAccounts && mode === "iris" && tab === "settings" && (
          <section className="section">
            <div className="section-head">
              <h2>Intelligence features</h2>
            </div>
            {!features ? (
              <div className="empty-state">Loading settings…</div>
            ) : (
              <div className="account-list">
                {Object.entries(features).map(([key, f]) => (
                  <div className="account-row" key={key}>
                    <span className="account-name">{f.label}</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={f.enabled}
                        onChange={(e) => toggleFeature(key, e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            )}
            <p className="metric-note" style={{ marginTop: 16 }}>
              Round-up can also be turned on or off per card in the Cards tab.
            </p>
          </section>
        )}

        {hasAccounts && mode === "iris" && tab === "activity" && (
          <section className="section">
            <div className="section-head">
              <h2>Recent transactions</h2>
              {hasTransactions && <span className="section-count">{overview.recent_transactions.length}</span>}
            </div>
            {!hasTransactions && (
              <div className="empty-state">
                No transactions yet — this fills in once a card is connected and synced.
              </div>
            )}
            {hasTransactions && (
              <>
                <div className="tx-table-wrap tx-desktop-only">
                  <table className="tx-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Merchant</th>
                        <th>Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.recent_transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="tx-date">{tx.posted_date}</td>
                          <td>
                            <span className="tx-merchant">
                              {tx.merchants?.canonical_name ?? tx.merchant_name ?? "—"}
                            </span>
                            {tx.pending && <span className="tx-pending">Pending</span>}
                          </td>
                          <td className="tx-category">
                            {tx.subdomains ? (
                              <>
                                {tx.subdomains.domains && (
                                  <span className="tx-domain">{tx.subdomains.domains.label}</span>
                                )}
                                <span className="tx-subdomain">{tx.subdomains.label}</span>
                              </>
                            ) : (
                              (tx.plaid_category_primary ?? "Uncategorized").replace(/_/g, " ").toLowerCase()
                            )}
                          </td>
                          <td className={`tx-amount${tx.amount < 0 ? " negative" : ""}`}>
                            {tx.amount < 0 ? "+" : ""}${fmt(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="tx-card-list tx-mobile-only">
                  {overview.recent_transactions.map((tx) => (
                    <div className="tx-card" key={tx.id}>
                      <div className="tx-card-top">
                        <span className="tx-card-merchant">
                          {tx.merchants?.canonical_name ?? tx.merchant_name ?? "—"}
                        </span>
                        <span className={`tx-amount${tx.amount < 0 ? " negative" : ""}`}>
                          {tx.amount < 0 ? "+" : ""}${fmt(tx.amount)}
                        </span>
                      </div>
                      <div className="tx-card-bottom">
                        <span className="tx-date">{tx.posted_date}</span>
                        <span className="tx-category">
                          {tx.subdomains
                            ? tx.subdomains.label
                            : (tx.plaid_category_primary ?? "Uncategorized").replace(/_/g, " ").toLowerCase()}
                        </span>
                        {tx.pending && <span className="tx-pending">Pending</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {hasAccounts && mode === "iris" && (
        <nav className="tab-bar-mobile">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-mobile-button${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="tab-mobile-icon">{t.icon}</span>
              <span className="tab-mobile-label">{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
