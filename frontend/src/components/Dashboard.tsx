import { useEffect, useState } from "react";
import { api } from "../api/backend";
import { PlaidLinkButton } from "./PlaidLink";

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

  if (loading) return <p>Loading your data…</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!overview) return null;

  const hasAccounts = overview.accounts.length > 0;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Iris</h1>
        <PlaidLinkButton onSuccess={refresh} />
      </header>

      <section style={{ margin: "24px 0", padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <h2>Available in your ibag</h2>
        <p style={{ fontSize: 32, fontWeight: 600 }}>
          ${overview.ibag.projected_balance.toFixed(2)}
        </p>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          This is a projection, not spendable funds — round-ups are simulated in Phase 1.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Connected cards</h2>
        {!hasAccounts && <p>No cards connected yet — connect a card to see your data.</p>}
        {hasAccounts && (
          <ul>
            {overview.accounts.map((acct) => (
              <li key={acct.id}>
                {acct.name} {acct.mask ? `••${acct.mask}` : ""} — {acct.subtype ?? acct.type}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Recent transactions</h2>
        {overview.recent_transactions.length === 0 && (
          <p>No transactions yet — this fills in once a card is connected and synced.</p>
        )}
        {overview.recent_transactions.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th>Date</th>
                <th>Merchant</th>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {overview.recent_transactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td>{tx.posted_date}</td>
                  <td>
                    {tx.merchant_name ?? "—"} {tx.pending && <em>(pending)</em>}
                  </td>
                  <td>{tx.plaid_category_primary ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>${tx.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
