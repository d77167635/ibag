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

interface Intelligence {
  narrative: string;
  net_worth: { liquid_assets: number | null; as_of: string | null };
  debt_health: {
    revolving_debt: number | null;
    credit_utilization: number | null;
    change_pct_30d: number | null;
    interest_cost_attribution: null;
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
}

function formatType(subtype: string | null, type: string | null) {
  const raw = subtype ?? type ?? "account";
  return raw.replace(/_/g, " ");
}

type Tab = "overview" | "spending" | "bills" | "accounts" | "activity";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "spending", label: "Spending", icon: "◐" },
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

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
          <p className="balance-figure">${overview.ibag.projected_balance.toFixed(2)}</p>
          <p className="balance-note">
            This is a projection, not spendable funds — round-ups are simulated in Phase 1.
          </p>
        </section>

        {!hasAccounts && (
          <section className="section">
            <div className="empty-state">No cards connected yet — connect a card to see your data.</div>
          </section>
        )}

        {hasAccounts && tab === "overview" && intelligence && (
          <section className="section">
            {intelligence.narrative && <p className="narrative">{intelligence.narrative}</p>}

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
                      title={`${d.label}: $${d.amount.toFixed(2)}`}
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
                    ? `$${intelligence.cash_flow_safety.safeToSpend.toFixed(2)}`
                    : "—"}
                </p>
                {intelligence.cash_flow_safety.safeToSpend !== null && (
                  <p className="metric-note">
                    ${intelligence.cash_flow_safety.currentAvailable?.toFixed(2)} available minus $
                    {intelligence.cash_flow_safety.essentialBillsTotal.toFixed(2)} in essential bills due within{" "}
                    {intelligence.cash_flow_safety.horizonDays} days.
                  </p>
                )}
              </div>
              <div className="metric-card">
                <p className="metric-label">Liquid assets</p>
                <p className="metric-value">
                  {intelligence.net_worth.liquid_assets !== null
                    ? `$${intelligence.net_worth.liquid_assets.toFixed(2)}`
                    : "—"}
                </p>
                <p className="metric-note">Across connected checking &amp; savings accounts.</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Revolving debt</p>
                <p className="metric-value">
                  {intelligence.debt_health.revolving_debt !== null
                    ? `$${intelligence.debt_health.revolving_debt.toFixed(2)}`
                    : "—"}
                </p>
                <p className="metric-note">
                  {intelligence.debt_health.credit_utilization !== null
                    ? `${(intelligence.debt_health.credit_utilization * 100).toFixed(0)}% average utilization`
                    : "Across connected credit accounts."}
                  {intelligence.debt_health.change_pct_30d !== null && (
                    <>
                      {" "}
                      · {intelligence.debt_health.change_pct_30d >= 0 ? "↑" : "↓"}
                      {Math.abs(intelligence.debt_health.change_pct_30d).toFixed(0)}% (30d)
                    </>
                  )}
                </p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Round-up pace</p>
                <p className="metric-value">
                  {intelligence.roundup_projection.projected !== null
                    ? `$${intelligence.roundup_projection.projected.toFixed(2)}`
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
                  <p className="cashflow-value positive">+${intelligence.cash_flow.inflow!.toFixed(2)}</p>
                </div>
                <div className="cashflow-item">
                  <p className="metric-label">{intelligence.cash_flow.windowDays}-day outflow</p>
                  <p className="cashflow-value negative">-${intelligence.cash_flow.outflow!.toFixed(2)}</p>
                </div>
                <div className="cashflow-item">
                  <p className="metric-label">Net cash movement</p>
                  <p className={`cashflow-value ${intelligence.cash_flow.net >= 0 ? "positive" : "negative"}`}>
                    {intelligence.cash_flow.net >= 0 ? "+" : "-"}${Math.abs(intelligence.cash_flow.net).toFixed(2)}
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

        {hasAccounts && tab === "spending" && intelligence && (
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
                      ${a.amount.toFixed(2)} (typically ${a.typicalAmount.toFixed(2)})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {hasAccounts && tab === "bills" && intelligence && (
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
                      ${b.amount.toFixed(2)} · {b.expectedDate}
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
                        <span className="account-type">${p.balance.toFixed(2)} balance after</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </section>
        )}

        {hasAccounts && tab === "accounts" && (
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
                          ${Number(ledger.lifetime_roundup_total).toFixed(2)} round-ups
                        </span>
                      )}
                      <span className="account-type">{formatType(acct.subtype, acct.type)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {hasAccounts && tab === "activity" && (
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
                            {tx.pending && <span className="tx-pending">PENDING</span>}
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
                            {tx.amount < 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
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
                          {tx.amount < 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                        </span>
                      </div>
                      <div className="tx-card-bottom">
                        <span className="tx-date">{tx.posted_date}</span>
                        <span className="tx-category">
                          {tx.subdomains
                            ? tx.subdomains.label
                            : (tx.plaid_category_primary ?? "Uncategorized").replace(/_/g, " ").toLowerCase()}
                        </span>
                        {tx.pending && <span className="tx-pending">PENDING</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {hasAccounts && (
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
