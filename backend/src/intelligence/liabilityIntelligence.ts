export type LiabilityObservation = {
  id: string;
  account_id: string;
  effective_at: string | null;
  acquired_at: string | null;
  raw_response: unknown;
};

export type LiabilityIntelligence = {
  evidence_state: "calculated" | "insufficient_evidence";
  observation_count: number;
  liability_count: number;
  liabilities: Array<{
    key: string;
    account_id: string;
    liability_type: string | null;
    statement_balance: number | null;
    minimum_payment: number | null;
    last_payment_amount: number | null;
    last_payment_date: string | null;
    next_payment_due_date: string | null;
    is_overdue: boolean | null;
    apr_percentage: number | null;
    apr_type: string | null;
    evidence: "observed";
    limitation: string;
  }>;
  aggregate: {
    statement_balance: number | null;
    minimum_payment: number | null;
    overdue_count: number;
    apr_observations: number;
    highest_apr_percentage: number | null;
  };
  limitations: string[];
};

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstDefined(...values: unknown[]): unknown {
  return values.find(value => value !== null && value !== undefined);
}

function extractLiabilityPayload(raw: unknown): Record<string, unknown>[] {
  const root = object(raw);
  const liabilities = root.liabilities;
  if (Array.isArray(liabilities)) return liabilities.map(object).filter(value => Object.keys(value).length > 0);
  if (liabilities && typeof liabilities === "object") {
    const container = object(liabilities);
    const arrays = [container.accounts, container.credit_cards, container.mortgages, container.student_loans];
    const flattened = arrays.flatMap(value => Array.isArray(value) ? value.map(object) : []);
    if (flattened.length) return flattened;
    if (Object.keys(container).length) return [container];
  }
  const arrays = [root.accounts, root.credit_cards, root.mortgages, root.student_loans];
  const flattened = arrays.flatMap(value => Array.isArray(value) ? value.map(object) : []);
  if (flattened.length) return flattened;
  return Object.keys(root).length ? [root] : [];
}

function normalizePayload(accountId: string, payload: Record<string, unknown>, index: number, observationId: string, effectiveAt: string | null, acquiredAt: string | null) {
  const creditCard = object(payload.credit_card);
  const mortgage = object(payload.mortgage);
  const studentLoan = object(payload.student_loan);
  const nested = Object.keys(creditCard).length ? creditCard : Object.keys(mortgage).length ? mortgage : Object.keys(studentLoan).length ? studentLoan : payload;
  const type = stringOrNull(firstDefined(payload.liability_type, payload.type, payload.liabilityType,
    Object.keys(creditCard).length ? "credit_card" : null,
    Object.keys(mortgage).length ? "mortgage" : null,
    Object.keys(studentLoan).length ? "student_loan" : null));

  const statementBalance = numberOrNull(firstDefined(
    nested.last_statement_balance, nested.lastStatementBalance,
    payload.last_statement_balance, payload.lastStatementBalance,
  ));
  const minimumPayment = numberOrNull(firstDefined(
    nested.minimum_payment_amount, nested.minimumPaymentAmount,
    payload.minimum_payment_amount, payload.minimumPaymentAmount,
  ));
  const lastPaymentAmount = numberOrNull(firstDefined(
    nested.last_payment_amount, nested.lastPaymentAmount,
    payload.last_payment_amount, payload.lastPaymentAmount,
  ));
  const lastPaymentDate = stringOrNull(firstDefined(
    nested.last_payment_date, nested.lastPaymentDate,
    payload.last_payment_date, payload.lastPaymentDate,
  ));
  const nextDue = stringOrNull(firstDefined(
    nested.next_payment_due_date, nested.nextPaymentDueDate,
    payload.next_payment_due_date, payload.nextPaymentDueDate,
  ));
  const overdue = booleanOrNull(firstDefined(nested.is_overdue, nested.isOverdue, payload.is_overdue, payload.isOverdue));
  const apr = numberOrNull(firstDefined(nested.apr_percentage, nested.aprPercentage, payload.apr_percentage, payload.aprPercentage));
  const aprType = stringOrNull(firstDefined(nested.apr_type, nested.aprType, payload.apr_type, payload.aprType));

  return {
    key: `${observationId}:${accountId}:${index}`,
    account_id: accountId,
    liability_type: type,
    statement_balance: statementBalance === null ? null : round(statementBalance),
    minimum_payment: minimumPayment === null ? null : round(minimumPayment),
    last_payment_amount: lastPaymentAmount === null ? null : round(lastPaymentAmount),
    last_payment_date: lastPaymentDate,
    next_payment_due_date: nextDue,
    is_overdue: overdue,
    apr_percentage: apr === null ? null : round(apr),
    apr_type: aprType,
    effective_at: effectiveAt,
    acquired_at: acquiredAt,
    evidence: "observed" as const,
    limitation: "Liability fields are provider-observed when present. Missing fields remain unknown; these observations do not establish total outstanding debt beyond the reported field, contractual status, payoff date, affordability, or future payment behavior.",
  };
}

/**
 * Converts exact provider liability observations into a normalized intelligence
 * surface. It never creates provider observations or fills missing financial
 * fields. Multiple observations of the same account are retained so freshness
 * and temporal reconciliation can be performed by a higher-order layer.
 */
export function buildLiabilityIntelligence(observations: LiabilityObservation[]): LiabilityIntelligence {
  const liabilities = observations.flatMap(observation => extractLiabilityPayload(observation.raw_response)
    .map((payload, index) => normalizePayload(observation.account_id, payload, index, observation.id, observation.effective_at, observation.acquired_at)));

  const statementBalances = liabilities.map(value => value.statement_balance).filter((value): value is number => value !== null);
  const minimumPayments = liabilities.map(value => value.minimum_payment).filter((value): value is number => value !== null);
  const aprs = liabilities.map(value => value.apr_percentage).filter((value): value is number => value !== null);

  return {
    evidence_state: liabilities.length ? "calculated" : "insufficient_evidence",
    observation_count: observations.length,
    liability_count: liabilities.length,
    liabilities,
    aggregate: {
      statement_balance: statementBalances.length ? round(statementBalances.reduce((sum, value) => sum + value, 0)) : null,
      minimum_payment: minimumPayments.length ? round(minimumPayments.reduce((sum, value) => sum + value, 0)) : null,
      overdue_count: liabilities.filter(value => value.is_overdue === true).length,
      apr_observations: aprs.length,
      highest_apr_percentage: aprs.length ? round(Math.max(...aprs)) : null,
    },
    limitations: liabilities.length
      ? [
          "Only fields present in the exact provider liability observations are reported.",
          "Aggregate statement balances and minimum payments are sums of reported observations and are not a substitute for a verified total outstanding balance or contractual obligation schedule.",
          "APR and overdue indicators are reported provider fields when present; they do not establish financial harm, causation, or future delinquency.",
        ]
      : ["No usable provider liability observations are available in the supplied evidence set; missing liability data is not represented as zero."],
  };
}
