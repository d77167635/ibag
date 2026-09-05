import type { CSSProperties } from "react";

type Props = { overview: any; intel?: any };

const panel: CSSProperties = { background: "#111722", border: "1px solid #2a3445", borderRadius: 16, padding: 20, color: "#eef2f8", marginTop: 12 };
const card: CSSProperties = { background: "#171e2a", border: "1px solid #2a3445", borderRadius: 14, padding: 14, color: "#eef2f8" };
const money = (n: number | null | undefined) => n == null ? "—" : `${n < 0 ? "−" : ""}$${Math.abs(Number(n)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const label = (s: string) => String(s ?? "").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, c => c.toUpperCase());
const date = (s: string | null | undefined) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function Evidence({ state = "observed" }: { state?: string }) { const names: Record<string,string> = { observed: "Observed", calculated: "Calculated", inferred: "Iris inference", limited: "Limited evidence", insufficient_evidence: "Insufficient evidence" }; return <span className={`iris4-evidence ${state}`}>{names[state] ?? label(state)}</span>; }

export function IrisObservedFinancialSurface({ overview, intel }: Props) {
  const accounts = overview?.accounts ?? [];
  const tx = overview?.recent_transactions ?? [];
  const merchantTotals = new Map<string, number>();
  const categoryTotals = new Map<string, number>();
  for (const t of tx) {
    const amount = Number(t.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const merchant = t.merchants?.canonical_name ?? t.merchant_name ?? "Unknown merchant";
    const category = t.subdomains?.label ?? t.plaid_category_detailed ?? t.plaid_category_primary ?? "Uncategorized";
    merchantTotals.set(merchant, (merchantTotals.get(merchant) ?? 0) + amount);
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + amount);
  }
  const merchants = [...merchantTotals.entries()].sort((a,b) => b[1] - a[1]).slice(0, 10);
  const categories = [...categoryTotals.entries()].sort((a,b) => b[1] - a[1]).slice(0, 10);
  const totalObservedBalance = accounts.reduce((sum: number, a: any) => sum + (Number(a.current_balance ?? a.available_balance) || 0), 0);
  const evidence = intel?.source_fidelity;
  const boundaryState = evidence?.status === "pass" ? "calculated" : evidence?.status === "fail" ? "insufficient_evidence" : "limited";
  return <section style={panel} aria-label="Iris observed financial surface">
    <div className="iris4-panel-head"><span>OBSERVED FINANCIAL DETAIL</span><Evidence/></div>
    <p className="iris4-note">Real provider-derived financial information remains visible here. Iris analysis is layered above it; absence of a field is not treated as a fact.</p>

    <div className="iris4-metrics" style={{ marginTop: 12 }}>
      <div style={card}><span>Accounts observed</span><strong>{accounts.length}</strong><small>Current connected account records</small></div>
      <div style={card}><span>Transactions observed</span><strong>{tx.length}</strong><small>Current active, posted provider-derived records in the dashboard window</small></div>
      <div style={card}><span>Aggregate account balance</span><strong>{money(totalObservedBalance)}</strong><small>Across displayed observed accounts</small></div>
      <div style={card}><span>Provider fidelity</span><strong>{evidence?.status ?? "—"}</strong><small>{evidence?.limitations?.length ? `${evidence.limitations.length} limitation${evidence.limitations.length === 1 ? "" : "s"}` : "No reported limitation"}</small></div>
    </div>

    <div className="iris4-two-col" style={{ marginTop: 12 }}>
      <div style={card}><div className="iris4-panel-head"><span>RECENT TRANSACTIONS</span><b>{tx.length}</b></div>{tx.slice(0, 20).map((t:any) => <div className="iris4-row" key={t.id}><div><span>{t.merchants?.canonical_name ?? t.merchant_name ?? "Transaction"}</span><small>{date(t.posted_date)} · {label(t.transaction_class ?? "unclassified")} · {t.account_id ? "linked account" : "account unavailable"}</small></div><strong>{money(t.amount)}</strong></div>)}{!tx.length && <span className="iris4-empty">No observed transactions.</span>}</div>
      <div style={card}><div className="iris4-panel-head"><span>MERCHANT CONCENTRATION</span><b>Top {merchants.length}</b></div>{merchants.map(([name, amount]) => <div className="iris4-row" key={name}><span>{name}</span><strong>{money(amount)}</strong></div>)}{!merchants.length && <span className="iris4-empty">No merchant spending evidence.</span>}</div>
    </div>

    <div className="iris4-two-col" style={{ marginTop: 12 }}>
      <div style={card}><div className="iris4-panel-head"><span>CATEGORY / SUBDOMAIN DETAIL</span><b>Top {categories.length}</b></div>{categories.map(([name, amount]) => <div className="iris4-row" key={name}><span>{name}</span><strong>{money(amount)}</strong></div>)}{!categories.length && <span className="iris4-empty">No category evidence.</span>}</div>
      <div style={card}><div className="iris4-panel-head"><span>ACCOUNT BALANCES</span><b>{accounts.length}</b></div>{accounts.map((a:any) => <div className="iris4-row" key={a.id}><div><span>{a.name ?? "Account"}</span><small>{label(a.type ?? "account")} · {a.mask ? `•••• ${a.mask}` : "mask unavailable"}</small></div><strong>{money(a.current_balance ?? a.available_balance)}</strong></div>)}{!accounts.length && <span className="iris4-empty">No observed accounts.</span>}</div>
    </div>

    <div style={{ ...card, marginTop: 12 }}><div className="iris4-panel-head"><span>OBSERVATION BOUNDARY</span><Evidence state={boundaryState}/></div><p className="iris4-note">Transactions shown here are current active, posted provider-derived records available to the dashboard. Merchant and category totals are calculations over those displayed records, not provider assertions. Iris higher-order conclusions remain evidence-gated when source fidelity is not certified.</p></div>
  </section>;
}
