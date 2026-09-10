import type { CanonicalTransaction } from "./transactionSemantics.js";
import type { Evidence } from "./types.js";

type Entity = {
  id: string;
  kind: "account" | "merchant" | "domain" | "subdomain" | "category";
  label: string;
  transaction_count: number;
  observed_amount: number;
  first_observed_date: string | null;
  last_observed_date: string | null;
  evidence: Evidence;
};

type Relationship = {
  id: string;
  from: string;
  to: string;
  kind: "account_merchant" | "merchant_domain" | "domain_subdomain" | "transaction_class";
  transaction_count: number;
  observed_amount: number;
  share_of_from_amount: number | null;
  evidence: Evidence;
  basis: string;
};

function add(map: Map<string, Entity>, entity: Entity) {
  const current = map.get(entity.id);
  if (!current) { map.set(entity.id, entity); return; }
  current.transaction_count += entity.transaction_count;
  current.observed_amount += entity.observed_amount;
  if (!current.first_observed_date || (entity.first_observed_date && entity.first_observed_date < current.first_observed_date)) current.first_observed_date = entity.first_observed_date;
  if (!current.last_observed_date || (entity.last_observed_date && entity.last_observed_date > current.last_observed_date)) current.last_observed_date = entity.last_observed_date;
}

function relationKey(kind: Relationship["kind"], from: string, to: string) { return `${kind}:${from}:${to}`; }

/**
 * Builds the canonical financial-life ontology from already canonicalized,
 * evidence-gated transactions. This is a semantic state model, not a second
 * provider dataset: every entity and relationship is calculated from supplied
 * observations and no missing value is converted to zero evidence.
 */
export function buildCanonicalLifeState(transactions: CanonicalTransaction[], evidenceBoundary: string | null = null) {
  const entities = new Map<string, Entity>();
  const relationships = new Map<string, Relationship>();
  const totals = new Map<string, number>();
  const firstSeen = new Map<string, string>();
  const lastSeen = new Map<string, string>();

  for (const tx of transactions) {
    if (!Number.isFinite(tx.amount) || !tx.posted_date) continue;
    const amount = Math.abs(tx.amount);
    const account = `account:${tx.account_id}`;
    add(entities, { id: account, kind: "account", label: tx.account_id, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    const merchant = tx.merchant_id || tx.merchant_name ? `merchant:${tx.merchant_id ?? tx.merchant_name}` : null;
    const domain = tx.domain?.key ? `domain:${tx.domain.key}` : null;
    const subdomain = tx.subdomain?.key ? `subdomain:${tx.subdomain.key}` : null;
    const categoryValue = tx.plaid_category_detailed ?? tx.plaid_category_primary;
    const category = categoryValue ? `category:${categoryValue}` : null;
    const classId = `transaction_class:${tx.transaction_class}`;

    if (merchant) add(entities, { id: merchant, kind: "merchant", label: tx.merchant_name ?? tx.merchant_id!, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    if (domain) add(entities, { id: domain, kind: "domain", label: tx.domain!.label, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    if (subdomain) add(entities, { id: subdomain, kind: "subdomain", label: tx.subdomain!.label, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    if (category) add(entities, { id: category, kind: "category", label: categoryValue!, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });

    const classEntity = `class:${tx.transaction_class}`;
    add(entities, { id: classEntity, kind: "category", label: tx.transaction_class, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });

    const touch = (id: string) => { totals.set(id, (totals.get(id) ?? 0) + amount); const oldFirst = firstSeen.get(id); const oldLast = lastSeen.get(id); if (!oldFirst || tx.posted_date < oldFirst) firstSeen.set(id, tx.posted_date); if (!oldLast || tx.posted_date > oldLast) lastSeen.set(id, tx.posted_date); };
    touch(account); touch(classEntity); if (merchant) touch(merchant); if (domain) touch(domain); if (subdomain) touch(subdomain); if (category) touch(category);

    const connect = (from: string, to: string, kind: Relationship["kind"]) => {
      const key = relationKey(kind, from, to);
      const current = relationships.get(key);
      if (current) { current.transaction_count++; current.observed_amount += amount; return; }
      relationships.set(key, { id: key, from, to, kind, transaction_count: 1, observed_amount: amount, share_of_from_amount: null, evidence: "calculated", basis: "Relationship is calculated from canonical transactions sharing the same observed account, merchant, domain, subdomain, category, or transaction class." });
    };
    if (merchant) connect(account, merchant, "account_merchant");
    if (merchant && domain) connect(merchant, domain, "merchant_domain");
    if (domain && subdomain) connect(domain, subdomain, "domain_subdomain");
    connect(account, classEntity, "transaction_class");
  }

  for (const relationship of relationships.values()) {
    const fromTotal = totals.get(relationship.from);
    relationship.share_of_from_amount = fromTotal && fromTotal > 0 ? Number((relationship.observed_amount / fromTotal).toFixed(6)) : null;
  }

  const entityList = [...entities.values()].map(entity => ({ ...entity, observed_amount: Number(entity.observed_amount.toFixed(2)), first_observed_date: firstSeen.get(entity.id) ?? entity.first_observed_date, last_observed_date: lastSeen.get(entity.id) ?? entity.last_observed_date }));
  const relationshipList = [...relationships.values()].map(relationship => ({ ...relationship, observed_amount: Number(relationship.observed_amount.toFixed(2)) }));
  const accountEntities = entityList.filter(entity => entity.kind === "account");
  const merchantEntities = entityList.filter(entity => entity.kind === "merchant");
  const domainEntities = entityList.filter(entity => entity.kind === "domain");

  return {
    architecture_version: "IRIS_CANONICAL_LIFE_STATE_V1",
    evidence_state: transactions.length ? "calculated" as const : "insufficient_evidence" as const,
    evidence_boundary: evidenceBoundary,
    transaction_count: transactions.length,
    entity_count: entityList.length,
    relationship_count: relationshipList.length,
    entities: entityList,
    relationships: relationshipList,
    topology: {
      accounts: accountEntities.length,
      merchants: merchantEntities.length,
      domains: domainEntities.length,
      connected_accounts: new Set(relationshipList.filter(r => r.kind === "account_merchant").map(r => r.from)).size,
      connected_merchants: new Set(relationshipList.filter(r => r.kind === "merchant_domain").map(r => r.from)).size,
    },
    limitations: transactions.length ? [
      "Relationships represent observed/calculated co-occurrence in canonical evidence; they do not establish causation, intent, necessity, or future behavior.",
      "Entity identity is limited to provider/canonical identifiers available in the supplied transaction evidence; absent identifiers remain unresolved.",
    ] : ["No canonical transaction evidence is available, so the financial-life ontology cannot be constructed."]
  };
}
