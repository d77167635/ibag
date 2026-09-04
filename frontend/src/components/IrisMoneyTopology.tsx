import type { CSSProperties } from "react";

type Account = {
  id: string;
  name?: string;
  current_balance?: number | null;
  available_balance?: number | null;
  type?: string;
  mask?: string | null;
};

type Props = {
  accounts: Account[];
  liquidAssets?: number | null;
  revolvingDebt?: number | null;
  safeToSpend?: number | null;
  roundUpOpportunities?: number | null;
};

const money = (n: number | null | undefined) =>
  n == null
    ? "—"
    : `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

function Node({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "cyan" | "violet" | "amber" | "green" }) {
  return (
    <article className={`iris-topology-node ${tone}`}>
      <span className="iris-topology-node-pulse" />
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{detail}</em>
    </article>
  );
}

export function IrisMoneyTopology({ accounts, liquidAssets, revolvingDebt, safeToSpend, roundUpOpportunities }: Props) {
  return (
    <section className="iris-money-topology" aria-label="Financial topology">
      <div className="iris-topology-orbit orbit-a" />
      <div className="iris-topology-orbit orbit-b" />
      <div className="iris-topology-center">
        <span>iBag · MONEY STATE</span>
        <strong>{money(liquidAssets)}</strong>
        <small>Observed liquid position</small>
      </div>

      <div className="iris-topology-node-layer accounts">
        {accounts.slice(0, 8).map((account, index) => (
          <div
            className="iris-topology-account-wrap"
            key={account.id}
            style={{ "--node-index": index, "--node-total": Math.min(accounts.length, 8) } as CSSProperties}
          >
            <Node
              label={account.name ?? "Observed account"}
              value={money(account.current_balance ?? account.available_balance)}
              detail={`${account.type ?? "account"}${account.mask ? ` · •••• ${account.mask}` : ""}`}
              tone={index % 3 === 0 ? "cyan" : index % 3 === 1 ? "violet" : "green"}
            />
            <span className="iris-topology-link" />
          </div>
        ))}
      </div>

      <div className="iris-topology-bottom">
        <Node label="Liquidity safety" value={money(safeToSpend)} detail="Calculated · evidence bounded" tone="green" />
        <Node label="Revolving pressure" value={money(revolvingDebt)} detail="Observed / calculated debt state" tone="amber" />
        <Node label="Round-Up field" value={roundUpOpportunities == null ? "—" : roundUpOpportunities.toLocaleString("en-US")} detail="Observed eligible opportunities" tone="cyan" />
      </div>
    </section>
  );
}
