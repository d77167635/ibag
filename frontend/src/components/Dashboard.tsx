import { useEffect, useState } from "react";
import { api } from "../api/backend";
import { supabase } from "../api/supabase";
import { PlaidLinkButton } from "./PlaidLink";
import { IrisMark } from "./IrisMark";

interface Account {
  id: string;
  name: string;
  mask: string | null;
  type: string | null;
  subtype: string | null;
}

interface Transaction {
  id: string;
  merchant_name: string | null;
  amount: number;
  posted_date: string;
  plaid_category_primary: string | null;
  pending: boolean;
}

interface Overview {
  accounts: Account[];
  recent_transactions: Transaction[];
  ibag: { projected_balance: number };
}

function formatType(subtype: string | null, type: string | null) {
  const raw = subtype ?? type ?? "account";
  return raw.replace(/_/g, " ");
}

export function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOverview();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
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

        <section className="section">
          <div className="section-head">
            <h2>Connected cards</h2>
            {hasAccounts && <span className="section-count">{overview.accounts.length}</span>}
          </div>
          {!hasAccounts && (
            <div className="empty-state">No cards connected yet — connect a card to see your data.</div>
          )}
          {hasAccounts && (
            <div className="account-list">
              {overview.accounts.map((acct) => (
                <div className="account-row" key={acct.id}>
                  <span className="account-name">
                    {acct.name}
                    {acct.mask && <span className="account-mask">••{acct.mask}</span>}
                  </span>
                  <span className="account-type">{formatType(acct.subtype, acct.type)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

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
                        <span className="tx-merchant">{tx.merchant_name ?? "—"}</span>
                        {tx.pending && <span className="tx-pending">PENDING</span>}
                      </td>
                      <td className="tx-category">
                        {(tx.plaid_category_primary ?? "—").replace(/_/g, " ").toLowerCase()}
                      </td>
                      <td className={`tx-amount${tx.amount < 0 ? " negative" : ""}`}>
                        {tx.amount < 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
