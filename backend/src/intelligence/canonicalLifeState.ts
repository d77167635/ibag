import type { CanonicalTransaction } from "./transactionSemantics.js";
import type { Evidence } from "./types.js";

type Entity = {
  id: string;
  kind: "account" | "merchant" | "domain" | "subdomain" | "category" | "transaction_class";
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
  kind: "account_merchant" | "merchant_domain" | "domain_subdomain" | "account_transaction_class";
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
function round(value: number) { return Number(value.toFixed(6)); }

/**
 * Builds the canonical financial-life ontology from already canonicalized,
 * evidence-gated transactions. This is a semantic state model, not a second
 * provider dataset: every entity, relationship, flow and concentration metric
 * is calculated from supplied observations and no missing value is converted
 * to zero evidence.
 */
export function buildCanonicalLifeState(transactions: CanonicalTransaction[], evidenceBoundary: string | null = null) {
  const entities = new Map<string, Entity>();
  const relationships = new Map<string, Relationship>();
  const totals = new Map<string, number>();
  const firstSeen = new Map<string, string>();
  const lastSeen = new Map<string, string>();
  const classTotals = new Map<string, { count: number; inflow: number; outflow: number; absolute: number }>();
  const merchantTotals = new Map<string, { label: string; amount: number; count: number }>();
  const domainTotals = new Map<string, { label: string; amount: number; count: number }>();
  const accountTotals = new Map<string, { amount: number; count: number }>();
  const dates = new Set<string>();
  let inflow = 0;
  let outflow = 0;
  let economicTransactionCount = 0;

  for (const tx of transactions) {
    if (!Number.isFinite(tx.amount) || !tx.posted_date) continue;
    const amount = Math.abs(tx.amount);
    const isInflow = tx.amount < 0 && (tx.transaction_class === "income" || tx.transaction_class === "refund");
    const isOutflow = tx.amount > 0 && (tx.transaction_class === "purchase" || tx.transaction_class === "debt_payment" || tx.transaction_class === "fee");
    if (isInflow) inflow += amount;
    if (isOutflow) outflow += amount;
    if (isInflow || isOutflow) economicTransactionCount++;
    dates.add(tx.posted_date);

    const account = `account:${tx.account_id}`;
    add(entities, { id: account, kind: "account", label: tx.account_id, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    const merchant = tx.merchant_id || tx.merchant_name ? `merchant:${tx.merchant_id ?? tx.merchant_name}` : null;
    const domain = tx.domain?.key ? `domain:${tx.domain.key}` : null;
    const subdomain = tx.subdomain?.key ? `subdomain:${tx.subdomain.key}` : null;
    const categoryValue = tx.plaid_category_detailed ?? tx.plaid_category_primary;
    const category = categoryValue ? `category:${categoryValue}` : null;
    const classEntity = `transaction_class:${tx.transaction_class}`;

    if (merchant) add(entities, { id: merchant, kind: "merchant", label: tx.merchant_name ?? tx.merchant_id!, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    if (domain) add(entities, { id: domain, kind: "domain", label: tx.domain!.label, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    if (subdomain) add(entities, { id: subdomain, kind: "subdomain", label: tx.subdomain!.label, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    if (category) add(entities, { id: category, kind: "category", label: categoryValue!, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    add(entities, { id: classEntity, kind: "transaction_class", label: tx.transaction_class, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });

    const touch = (id: string) => { totals.set(id, (totals.get(id) ?? 0) + amount); const oldFirst = firstSeen.get(id); const oldLast = lastSeen.get(id); if (!oldFirst || tx.posted_date < oldFirst) firstSeen.set(id, tx.posted_date); if (!oldLast || tx.posted_date > oldLast) lastSeen.set(id, tx.posted_date); };
    touch(account); touch(classEntity); if (merchant) touch(merchant); if (domain) touch(domain); if (subdomain) touch(subdomain); if (category) touch(category);

    const classEntry = classTotals.get(tx.transaction_class) ?? { count: 0, inflow: 0, outflow: 0, absolute: 0 };
    classEntry.count++;
    classEntry.absolute += amount;
    if (isInflow) classEntry.inflow += amount;
    if (isOutflow) classEntry.outflow += amount;
    classTotals.set(tx.transaction_class, classEntry);

    const accountEntry = accountTotals.get(tx.account_id) ?? { amount: 0, count: 0 };
    accountEntry.amount += amount;
    accountEntry.count++;
    accountTotals.set(tx.account_id, accountEntry);

    if (merchant) {
      const entry = merchantTotals.get(merchant) ?? { label: tx.merchant_name ?? tx.merchant_id!, amount: 0, count: 0 };
      entry.amount += amount; entry.count++; merchantTotals.set(merchant, entry);
    }
    if (domain) {
      const entry = domainTotals.get(domain) ?? { label: tx.domain!.label, amount: 0, count: 0 };
      entry.amount += amount; entry.count++; domainTotals.set(domain, entry);
    }

    const connect = (from: string, to: string, kind: Relationship["kind"]) => {
      const key = relationKey(kind, from, to);
      const current = relationships.get(key);
      if (current) { current.transaction_count++; current.observed_amount += amount; return; }
      relationships.set(key, { id: key, from, to, kind, transaction_count: 1, observed_amount: amount, share_of_from_amount: null, evidence: "calculated", basis: "Relationship is calculated from canonical transactions sharing the same observed account, merchant, domain, subdomain, category, or transaction class." });
    };
    if (merchant) connect(account, merchant, "account_merchant");
    if (merchant && domain) connect(merchant, domain, "merchant_domain");
    if (domain && subdomain) connect(domain, subdomain, "domain_subdomain");
    connect(account, classEntity, "account_transaction_class");
  }

  for (const relationship of relationships.values()) {
    const fromTotal = totals.get(relationship.from);
    relationship.share_of_from_amount = fromTotal && fromTotal > 0 ? round(relationship.observed_amount / fromTotal) : null;
  }

  const entityList = [...entities.values()].map(entity => ({ ...entity, observed_amount: round(entity.observed_amount), first_observed_date: firstSeen.get(entity.id) ?? entity.first_observed_date, last_observed_date: lastSeen.get(entity.id) ?? entity.last_observed_date }));
  const relationshipList = [...relationships.values()].map(relationship => ({ ...relationship, observed_amount: round(relationship.observed_amount) }));
  const accountEntities = entityList.filter(entity => entity.kind === "account");
  const merchantEntities = entityList.filter(entity => entity.kind === "merchant");
  const domainEntities = entityList.filter(entity => entity.kind === "domain");
  const classEntities = entityList.filter(entity => entity.kind === "transaction_class");
  const orderedMerchants = [...merchantTotals.entries()].sort((a, b) => b[1].amount - a[1].amount);
  const orderedDomains = [...domainTotals.entries()].sort((a, b) => b[1].amount - a[1].amount);
  const totalAbsolute = [...classTotals.values()].reduce((sum, entry) => sum + entry.absolute, 0);
  const sortedDates = [...dates].sort();
  const activeDayCount = dates.size;
  const observationStart = sortedDates[0] ?? null;
  const observationEnd = sortedDates.at(-1) ?? null;
  const observationSpanDays = observationStart && observationEnd ? Math.max(1, Math.round((new Date(observationEnd).getTime() - new Date(observationStart).getTime()) / 86_400_000) + 1) : null;

  return {
    architecture_version: "IRIS_CANONICAL_LIFE_STATE_V3",
    evidence_state: transactions.length ? "calculated" as const : "insufficient_evidence" as const,
    evidence_boundary: evidenceBoundary,
    transaction_count: transactions.length,
    economic_transaction_count: economicTransactionCount,
    entity_count: entityList.length,
    relationship_count: relationshipList.length,
    observation: {
      start_date: observationStart,
      end_date: observationEnd,
      span_days: observationSpanDays,
      active_day_count: activeDayCount,
      activity_density: observationSpanDays ? round(activeDayCount / observationSpanDays) : null,
      evidence: transactions.length ? "calculated" as const : "insufficient_evidence" as const,
    },
    flow: {
      inflow: round(inflow),
      outflow: round(outflow),
      net: round(inflow - outflow),
      evidence: economicTransactionCount ? "calculated" as const : "insufficient_evidence" as const,
      basis: economicTransactionCount ? "Observed canonical transactions classified as income/refund inflows and purchase/debt_payment/fee outflows." : null,
    },
    transaction_class_distribution: [...classTotals.entries()].map(([transaction_class, value]) => ({
      transaction_class,
      transaction_count: value.count,
      absolute_amount: round(value.absolute),
      inflow: round(value.inflow),
      outflow: round(value.outflow),
      share_of_absolute_activity: totalAbsolute > 0 ? round(value.absolute / totalAbsolute) : null,
      evidence: "calculated" as const,
    })).sort((a, b) => b.absolute_amount - a.absolute_amount),
    account_activity: [...accountTotals.entries()].map(([account_id, value]) => ({ account_id, transaction_count: value.count, absolute_amount: round(value.amount), share_of_activity: totalAbsolute > 0 ? round(value.amount / totalAbsolute) : null, evidence: "calculated" as const })).sort((a, b) => b.absolute_amount - a.absolute_amount),
    merchant_concentration: {
      total_absolute_activity: round([...merchantTotals.values()].reduce((sum, entry) => sum + entry.amount, 0)),
      merchants_observed: merchantTotals.size,
      top: orderedMerchants.slice(0, 20).map(([id, value]) => ({ id, label: value.label, transaction_count: value.count, absolute_amount: round(value.amount), share_of_merchant_activity: totalAbsolute > 0 ? round(value.amount / totalAbsolute) : null, evidence: "calculated" as const })),
      evidence: merchantTotals.size ? "calculated" as const : "insufficient_evidence" as const,
    },
    domain_concentration: {
      domains_observed: domainTotals.size,
      top: orderedDomains.slice(0, 20).map(([id, value]) => ({ id, label: value.label, transaction_count: value.count, absolute_amount: round(value.amount), share_of_activity: totalAbsolute > 0 ? round(value.amount / totalAbsolute) : null, evidence: "calculated" as const })),
      evidence: domainTotals.size ? "calculated" as const : "insufficient_evidence" as const,
    },
    entities: entityList,
    relationships: relationshipList,
    topology: {
      accounts: accountEntities.length,
      merchants: merchantEntities.length,
      domains: domainEntities.length,
      transaction_classes: classEntities.length,
      connected_accounts: new Set(relationshipList.filter(r => r.kind === "account_merchant").map(r => r.from)).size,
      connected_merchants: new Set(relationshipList.filter(r => r.kind === "merchant_domain").map(r => r.from)).size,
    },
    limitations: transactions.length ? [
      "Relationships represent observed/calculated co-occurrence in canonical evidence; they do not establish causation, intent, necessity, or future behavior.",
      "Entity identity is limited to provider/canonical identifiers available in the supplied transaction evidence; absent identifiers remain unresolved.",
      "Flow totals exclude transaction classes that are not classified as economic inflow or outflow; excluded activity is not treated as zero.",
      "Concentration metrics use absolute observed transaction amounts and describe activity concentration, not financial health by themselves.",
    ] : ["No canonical transaction evidence is available, so the financial-life ontology cannot be constructed."]
  };
}
