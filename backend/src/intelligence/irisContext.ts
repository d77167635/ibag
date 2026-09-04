export type IrisIntent =
  | "overview"
  | "cash_flow"
  | "spending"
  | "liquidity"
  | "debt"
  | "roundups"
  | "anomaly"
  | "explanation"
  | "provider_data"
  | "unknown";

export type IrisQuestionContext = {
  surface?: string;
  accountId?: string;
  transactionId?: string;
  product?: string;
  timeWindowDays?: number;
};

const INTENT_RULES: Array<[IrisIntent, RegExp]> = [
  ["roundups", /round.?ups?|spare change|ibag balance/],
  ["liquidity", /safe to spend|liquid|liquidity|available cash|cash on hand/],
  ["cash_flow", /cash flow|cashflow|income.*expense|inflow|outflow/],
  ["spending", /spend|spending|expense|expenses|merchant|category|where.*money/],
  ["debt", /debt|credit card|utilization|loan|liabilit/],
  ["anomaly", /anomal|unusual|strange|unexpected|different|spike/],
  ["explanation", /why|explain|how.*calculate|how.*work|what.*mean/],
  ["provider_data", /plaid|provider|institution|account|transaction|balance|identity|investment|liabilit|transfer|signal/],
  ["overview", /what.*happen|what.*going on|overview|summar|tell me|financial life|money/],
];

export function resolveIrisContext(question: string, supplied?: IrisQuestionContext): {
  intent: IrisIntent;
  context: IrisQuestionContext;
  normalizedQuestion: string;
} {
  const normalizedQuestion = question.trim().replace(/\s+/g, " ");
  const q = normalizedQuestion.toLowerCase();
  const intent = INTENT_RULES.find(([, pattern]) => pattern.test(q))?.[0] ?? "unknown";
  const timeWindowDays = supplied?.timeWindowDays && [7, 14, 30, 90, 180, 365].includes(supplied.timeWindowDays)
    ? supplied.timeWindowDays
    : undefined;
  return {
    intent,
    normalizedQuestion,
    context: { ...supplied, timeWindowDays },
  };
}

export function intentDomains(intent: IrisIntent): string[] {
  switch (intent) {
    case "cash_flow": return ["cash_flow", "balance_history", "temporal"];
    case "spending": return ["spending_by_domain", "spending_hierarchy", "behavioral", "temporal"];
    case "liquidity": return ["cash_flow_safety", "balance_history", "cash_flow", "temporal"];
    case "debt": return ["debt_health", "debt_cost", "temporal"];
    case "roundups": return ["roundup_projection", "roundups", "transactions"];
    case "anomaly": return ["anomalies", "spending_by_domain", "temporal"];
    case "explanation": return ["provenance", "reasoning", "evidence_coverage"];
    case "provider_data": return ["plaid_source", "accounts", "transactions", "product_observations"];
    case "overview": return ["reasoning", "cash_flow", "liquidity", "spending", "debt", "roundups", "anomalies"];
    default: return ["evidence_coverage", "provenance"];
  }
}
