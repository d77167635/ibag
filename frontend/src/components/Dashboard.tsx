import { useEffect, useState } from "react";
import { api } from "../api/backend";
import { supabase } from "../api/supabase";
import { PlaidLinkButton } from "./PlaidLink";
import { IrisMark } from "./IrisMark";
import { BalanceTrendChart } from "./BalanceTrendChart";

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
  balance_history: { date: string; liquidAssets: number }[];
  forward_projection: { series: { date: string; balance: number; event: string | null }[]; basis: string };
  anomalies: { merchant: string; amount: number; typicalAmount: number; date: string; pctAboveTypical: number }[];
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

type Tab = "overview" | "spending" | "bills" | "accounts" | "activity";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "spending", label: "Spending" },
  { id: "bills", label: "Bills & Safety" },
  { id: "accounts", label: "Accounts" },
  { id: "activity", label: "Activity" },
];

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
          <p className="state-line">Loading your data…</p>
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
  const maxSpend = intelligence?.spending_by_domain.length
    ? Math.max(...intelligence.spending_by_domain.map((x) => x.amount))
    : 1;

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

        {hasAccounts && (
          <nav className="tab-bar">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`tab-button${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}

        {!hasAccounts && (
          <section className="section">
            <div className="empty-state">No cards connected yet — connect a card to see your data.</div>
          </section>
        )}

        {hasAccounts && tab === "overview" && intelligence && (
          <section className="section">
            {intelligence.narrative && (
              <div className="narrative">
                <span className="narrative-label">Insight</span>
                {intelligence.narrative}
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

        {hasAccounts && tab === "spending" && intelligence && (
          <section className="section">
            {intelligence.spending_by_domain.length > 0 ? (
              <div className="spend-breakdown">
                <p className="metric-label" style={{ marginBottom: 8 }}>
                  Where money went (last 30 days)
                </p>
                {intelligence.spending_by_domain.map((d) => (
                  <div className="spend-row" key={d.key}>
                    <span className="spend-label">{d.label}</span>
                    <span className="spend-bar-track">
                      <span
                        className="spend-bar-fill"
                        style={{ width: `${Math.min(100, (d.amount / maxSpend) * 100)}%` }}
                      />
                    </span>
                    <span className="spend-amount">
                      ${fmt(d.amount)}
                      {d.changePct !== null && (
                        <span className="spend-change">
                          {" "}
                          ({d.changePct >= 0 ? "↑" : "↓"}
                          {Math.abs(d.changePct).toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
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
                      ${fmt(b.amount)} · {b.expectedDate}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No essential recurring bills detected yet.</div>
            )}

            {intelligence.forward_projection.series.length > 0 && (
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
                  {intelligence.forward_projection.series.filter((p) => p.event).length === 0 && (
                    <div className="empty-state">No known essential bills fall in the projection window.</div>
                  )}
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
                          ${fmt(Number(ledger.lifetime_roundup_total))} round-ups
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
              <div className="tx-table-wrap">
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
            )}
          </section>
        )}
      </div>
    </div>
  );
}
