import type { CanonicalTransaction } from "./transactionSemantics.js";

export type OntologyRelation = {
  id: string;
  from: string;
  to: string;
  relation: "merchant_category" | "merchant_subdomain" | "merchant_transaction_class" | "domain_transaction_class" | "subdomain_transaction_class" | "category_transaction_class" | "account_domain" | "account_subdomain" | "account_category" | "merchant_temporal";
  transaction_count: number;
  observed_amount: number;
  evidence: "calculated";
  basis: string;
};

function key(relation: OntologyRelation["relation"], from: string, to: string) {
  return `${relation}:${from}:${to}`;
}

/**
 * Extends the canonical ontology with additional relationships that can be
 * calculated from the same evidence-bound transactions. This is deliberately
 * descriptive: co-occurrence never becomes causation, intent, necessity, or
 * prediction.
 */
export function buildRelationalOntologyExpansion(transactions: CanonicalTransaction[]): OntologyRelation[] {
  const relations = new Map<string, OntologyRelation>();
  const connect = (from: string | null, to: string | null, relation: OntologyRelation["relation"], tx: CanonicalTransaction) => {
    if (!from || !to) return;
    const id = key(relation, from, to);
    const current = relations.get(id);
    if (current) {
      current.transaction_count += 1;
      current.observed_amount += Math.abs(tx.amount);
      return;
    }
    relations.set(id, {
      id,
      from,
      to,
      relation,
      transaction_count: 1,
      observed_amount: Math.abs(tx.amount),
      evidence: "calculated",
      basis: "Calculated from canonical transactions sharing the same observed provider/canonical identifiers; this relationship does not establish causation, intent, necessity, or future behavior.",
    });
  };

  for (const tx of transactions) {
    const merchant = tx.merchant_id || tx.merchant_name ? `merchant:${tx.merchant_id ?? tx.merchant_name}` : null;
    const account = tx.account_id ? `account:${tx.account_id}` : null;
    const domain = tx.domain?.key ? `domain:${tx.domain.key}` : null;
    const subdomain = tx.subdomain?.key ? `subdomain:${tx.subdomain.key}` : null;
    const categoryValue = tx.plaid_category_detailed ?? tx.plaid_category_primary;
    const category = categoryValue ? `category:${categoryValue}` : null;
    const transactionClass = `transaction_class:${tx.transaction_class}`;

    connect(merchant, category, "merchant_category", tx);
    connect(merchant, subdomain, "merchant_subdomain", tx);
    connect(merchant, transactionClass, "merchant_transaction_class", tx);
    connect(domain, transactionClass, "domain_transaction_class", tx);
    connect(subdomain, transactionClass, "subdomain_transaction_class", tx);
    connect(category, transactionClass, "category_transaction_class", tx);
    connect(account, domain, "account_domain", tx);
    connect(account, subdomain, "account_subdomain", tx);
    connect(account, category, "account_category", tx);

    if (merchant && tx.posted_date) {
      connect(merchant, `temporal:${tx.posted_date.slice(0, 7)}`, "merchant_temporal", tx);
    }
  }

  return [...relations.values()]
    .map(relation => ({ ...relation, observed_amount: Number(relation.observed_amount.toFixed(6)) }))
    .sort((a, b) => b.transaction_count - a.transaction_count || a.id.localeCompare(b.id));
}
