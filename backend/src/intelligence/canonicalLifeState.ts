import type { CanonicalTransaction } from "./transactionSemantics.js";
import type { Evidence } from "./types.js";

type Entity = {
  id: string;
  kind: "account" | "transaction" | "merchant" | "domain" | "subdomain" | "category" | "transaction_class" | "temporal";
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
  kind:
    | "account_transaction"
    | "transaction_merchant"
    | "account_merchant"
    | "merchant_domain"
    | "domain_subdomain"
    | "transaction_category"
    | "transaction_class"
    | "transaction_domain"
    | "transaction_subdomain"
    | "merchant_category"
    | "merchant_class"
    | "account_transaction_class"
    | "transaction_temporal";
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
 * evidence-gated transactions. Transaction nodes, temporal nodes, semantic
 * classifications, and edges are explicit so higher-order intelligence can
 * reason over individual observed events as well as aggregates. This module
 * creates no provider observations, financial values, or actions; every
 * numeric value is calculated from the supplied canonical evidence.
 */
export function buildCanonicalLifeState(transactions: CanonicalTransaction[], evidenceBoundary: string | null = null) {
  const entities = new Map<string, Entity>();
  const relationships = new Map<string, Relationship>();
  const totals = new Map<string, number>();
  const classTotals = new Map<string, { count: number; inflow: number; outflow: number; absolute: number }>();
  const merchantTotals = new Map<string, { label: string; amount: number; count: number }>();
  const domainTotals = new Map<string, { label: string; amount: number; count: number }>();
  const accountTotals = new Map<string, { amount: number; count: number }>();
  const categoryTotals = new Map<string, { label: string; amount: number; count: number }>();
  const dates = new Set<string>();
  const transactionSemantics: Array<{
    transaction_id: string;
    account_id: string;
    posted_date: string;
    amount: number;
    direction: "inflow" | "outflow" | "non_economic";
    economic_role: "economic_inflow" | "economic_outflow" | "non_economic_or_unclassified";
    transaction_class: string;
    classification_evidence: Evidence;
  }> = [];
  let inflow = 0;
  let outflow = 0;
  let economicTransactionCount = 0;

  for (const tx of transactions) {
    if (!Number.isFinite(tx.amount) || !tx.posted_date) continue;
    const amount = Math.abs(tx.amount);
    const isInflow = tx.amount < 0 && (tx.transaction_class === "income" || tx.transaction_class === "refund");
    const isOutflow = tx.amount > 0 && (tx.transaction_class === "purchase" || tx.transaction_class === "debt_payment" || tx.transaction_class === "fee");
    const direction = isInflow ? "inflow" : isOutflow ? "outflow" : "non_economic";
    const economicRole = isInflow ? "economic_inflow" : isOutflow ? "economic_outflow" : "non_economic_or_unclassified";
    if (isInflow) inflow += amount;
    if (isOutflow) outflow += amount;
    if (isInflow || isOutflow) economicTransactionCount++;
    dates.add(tx.posted_date);

    const transaction = `transaction:${tx.id}`;
    const account = `account:${tx.account_id}`;
    const merchant = tx.merchant_id || tx.merchant_name ? `merchant:${tx.merchant_id ?? tx.merchant_name}` : null;
    const domain = tx.domain?.key ? `domain:${tx.domain.key}` : null;
    const subdomain = tx.subdomain?.key ? `subdomain:${tx.subdomain.key}` : null;
    const categoryValue = tx.plaid_category_detailed ?? tx.plaid_category_primary;
    const category = categoryValue ? `category:${categoryValue}` : null;
    const classEntity = `transaction_class:${tx.transaction_class}`;
    const temporal = `date:${tx.posted_date}`;

    add(entities, { id: transaction, kind: "transaction", label: tx.id, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    add(entities, { id: account, kind: "account", label: tx.account_id, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    add(entities, { id: temporal, kind: "temporal", label: tx.posted_date, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    if (merchant) add(entities, { id: merchant, kind: "merchant", label: tx.merchant_name ?? tx.merchant_id!, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    if (domain) add(entities, { id: domain, kind: "domain", label: tx.domain!.label, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    if (subdomain) add(entities, { id: subdomain, kind: "subdomain", label: tx.subdomain!.label, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    if (category) add(entities, { id: category, kind: "category", label: categoryValue!, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });
    add(entities, { id: classEntity, kind: "transaction_class", label: tx.transaction_class, transaction_count: 1, observed_amount: amount, first_observed_date: tx.posted_date, last_observed_date: tx.posted_date, evidence: "calculated" });

    const touch = (id: string) => totals.set(id, (totals.get(id) ?? 0) + amount);
    touch(transaction); touch(account); touch(classEntity); touch(temporal); if (merchant) touch(merchant); if (domain) touch(domain); if (subdomain) touch(subdomain); if (category) touch(category);

    transactionSemantics.push({
      transaction_id: tx.id,
      account_id: tx.account_id,
      posted_date: tx.posted_date,
      amount: round(amount),
      direction,
      economic_role: economicRole,
      transaction_class: tx.transaction_class,
      classification_evidence: tx.classification_evidence,
    });

    const classEntry = classTotals.get(tx.transaction_class) ?? { count: 0, inflow: 0, outflow: 0, absolute: 0 };
    classEntry.count++; classEntry.absolute += amount;
    if (isInflow) classEntry.inflow += amount;
    if (isOutflow) classEntry.outflow += amount;
    classTotals.set(tx.transaction_class, classEntry);

    const accountEntry = accountTotals.get(tx.account_id) ?? { amount: 0, count: 0 };
    accountEntry.amount += amount; accountEntry.count++; accountTotals.set(tx.account_id, accountEntry);
    if (merchant) { const entry = merchantTotals.get(merchant) ?? { label: tx.merchant_name ?? tx.merchant_id!, amount: 0, count: 0 }; entry.amount += amount; entry.count++; merchantTotals.set(merchant, entry); }
    if (domain) { const entry = domainTotals.get(domain) ?? { label: tx.domain!.label, amount: 0, count: 0 }; entry.amount += amount; entry.count++; domainTotals.set(domain, entry); }
    if (category) { const entry = categoryTotals.get(category) ?? { label: categoryValue!, amount: 0, count: 0 }; entry.amount += amount; entry.count++; categoryTotals.set(category, entry); }

    const connect = (from: string, to: string, kind: Relationship["kind"], basis: string) => {
      const key = relationKey(kind, from, to);
      const current = relationships.get(key);
      if (current) { current.transaction_count++; current.observed_amount += amount; return; }
      relationships.set(key, { id: key, from, to, kind, transaction_count: 1, observed_amount: amount, share_of_from_amount: null, evidence: "calculated", basis });
    };
    const basis = "Calculated from the shared canonical transaction observation and its available semantic identifiers.";
    connect(account, transaction, "account_transaction", basis);
    if (merchant) { connect(transaction, merchant, "transaction_merchant", basis); connect(account, merchant, "account_merchant", basis); }
    if (domain) { if (merchant) connect(merchant, domain, "merchant_domain", basis); connect(transaction, domain, "transaction_domain", basis); }
    if (subdomain) { if (domain) connect(domain, subdomain, "domain_subdomain", basis); connect(transaction, subdomain, "transaction_subdomain", basis); }
    if (category) { connect(transaction, category, "transaction_category", basis); if (merchant) connect(merchant, category, "merchant_category", basis); }
    connect(transaction, classEntity, "transaction_class", basis);
    if (merchant) connect(merchant, classEntity, "merchant_class", basis);
    connect(account, classEntity, "account_transaction_class", basis);
    connect(transaction, temporal, "transaction_temporal", "Calculated from the transaction posted date; this is temporal association, not causation.");
  }

  for (const relationship of relationships.values()) {
    const fromTotal = totals.get(relationship.from);
    relationship.share_of_from_amount = fromTotal && fromTotal > 0 ? round(relationship.observed_amount / fromTotal) : null;
  }

  const entityList = [...entities.values()].map(entity => ({ ...entity, observed_amount: round(entity.observed_amount) }));
  const relationshipList = [...relationships.values()].map(relationship => ({ ...relationship, observed_amount: round(relationship.observed_amount) }));
  const accountEntities = entityList.filter(entity => entity.kind === "account");
  const merchantEntities = entityList.filter(entity => entity.kind === "merchant");
  const domainEntities = entityList.filter(entity => entity.kind === "domain");
  const subdomainEntities = entityList.filter(entity => entity.kind === "subdomain");
  const categoryEntities = entityList.filter(entity => entity.kind === "category");
  const transactionEntities = entityList.filter(entity => entity.kind === "transaction");
  const classEntities = entityList.filter(entity => entity.kind === "transaction_class");
  const temporalEntities = entityList.filter(entity => entity.kind === "temporal");
  const orderedMerchants = [...merchantTotals.entries()].sort((a, b) => b[1].amount - a[1].amount);
  const orderedDomains = [...domainTotals.entries()].sort((a, b) => b[1].amount - a[1].amount);
  const totalAbsolute = [...classTotals.values()].reduce((sum, entry) => sum + entry.absolute, 0);
  const sortedDates = [...dates].sort();
  const activeDayCount = dates.size;
  const observationStart = sortedDates[0] ?? null;
  const observationEnd = sortedDates.at(-1) ?? null;
  const observationSpanDays = observationStart && observationEnd ? Math.max(1, Math.round((new Date(observationEnd).getTime() - new Date(observationStart).getTime()) / 86_400_000) + 1) : null;
  const hasEconomicFlow = economicTransactionCount > 0;

  return {
    architecture_version: "IRIS_CANONICAL_LIFE_STATE_V6",
    evidence_state: transactions.length ? "calculated" as const : "insufficient_evidence" as const,
    evidence_boundary: evidenceBoundary,
    transaction_count: transactions.length,
    economic_transaction_count: economicTransactionCount,
    entity_count: entityList.length,
    relationship_count: relationshipList.length,
    observation: { start_date: observationStart, end_date: observationEnd, span_days: observationSpanDays, active_day_count: activeDayCount, activity_density: observationSpanDays ? round(activeDayCount / observationSpanDays) : null, evidence: transactions.length ? "calculated" as const : "insufficient_evidence" as const },
    flow: { inflow: hasEconomicFlow ? round(inflow) : null, outflow: hasEconomicFlow ? round(outflow) : null, net: hasEconomicFlow ? round(inflow - outflow) : null, evidence: hasEconomicFlow ? "calculated" as const : "insufficient_evidence" as const, basis: hasEconomicFlow ? "Observed canonical transactions classified as income/refund inflows and purchase/debt_payment/fee outflows." : null },
    transaction_semantics: transactionSemantics,
    transaction_class_distribution: [...classTotals.entries()].map(([transaction_class, value]) => ({ transaction_class, transaction_count: value.count, absolute_amount: round(value.absolute), inflow: round(value.inflow), outflow: round(value.outflow), share_of_absolute_activity: totalAbsolute > 0 ? round(value.absolute / totalAbsolute) : null, evidence: "calculated" as const })).sort((a, b) => b.absolute_amount - a.absolute_amount),
    account_activity: [...accountTotals.entries()].map(([account_id, value]) => ({ account_id, transaction_count: value.count, absolute_amount: round(value.amount), share_of_activity: totalAbsolute > 0 ? round(value.amount / totalAbsolute) : null, evidence: "calculated" as const })).sort((a, b) => b.absolute_amount - a.absolute_amount),
    merchant_concentration: { total_absolute_activity: merchantTotals.size ? round([...merchantTotals.values()].reduce((sum, entry) => sum + entry.amount, 0)) : null, merchants_observed: merchantTotals.size, top: orderedMerchants.slice(0, 20).map(([id, value]) => ({ id, label: value.label, transaction_count: value.count, absolute_amount: round(value.amount), share_of_merchant_activity: totalAbsolute > 0 ? round(value.amount / totalAbsolute) : null, evidence: "calculated" as const })), evidence: merchantTotals.size ? "calculated" as const : "insufficient_evidence" as const },
    domain_concentration: { domains_observed: domainTotals.size, top: orderedDomains.slice(0, 20).map(([id, value]) => ({ id, label: value.label, transaction_count: value.count, absolute_amount: round(value.amount), share_of_activity: totalAbsolute > 0 ? round(value.amount / totalAbsolute) : null, evidence: "calculated" as const })), evidence: domainTotals.size ? "calculated" as const : "insufficient_evidence" as const },
    topology: { accounts: accountEntities.length, transactions: transactionEntities.length, merchants: merchantEntities.length, domains: domainEntities.length, subdomains: subdomainEntities.length, categories: categoryEntities.length, transaction_classes: classEntities.length, temporal_nodes: temporalEntities.length, connected_accounts: new Set(relationshipList.filter(r => r.kind === "account_merchant").map(r => r.from)).size, connected_merchants: new Set(relationshipList.filter(r => r.kind === "merchant_domain").map(r => r.from)).size },
    entities: entityList,
    relationships: relationshipList,
    category_activity: [...categoryTotals.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 50).map(([id, value]) => ({ id, label: value.label, transaction_count: value.count, absolute_amount: round(value.amount), evidence: "calculated" as const })),
    limitations: transactions.length ? [
      "Relationships represent observed/calculated co-occurrence in canonical evidence; they do not establish causation, intent, necessity, or future behavior.",
      "Entity identity is limited to provider/canonical identifiers available in the supplied transaction evidence; absent identifiers remain unresolved.",
      "Flow totals exclude transaction classes that are not classified as economic inflow or outflow; excluded activity is not treated as zero.",
      "Concentration metrics use absolute observed transaction amounts and describe activity concentration, not financial health by themselves.",
      "Transaction-level temporal edges represent posted-date association only; they do not establish temporal causality.",
      "Transaction semantics describe the classification applied to supplied canonical evidence; they do not independently prove the economic intent of an unknown or disputed transaction.",
    ] : ["No canonical transaction evidence is available, so the financial-life ontology cannot be constructed."]
  };
}
