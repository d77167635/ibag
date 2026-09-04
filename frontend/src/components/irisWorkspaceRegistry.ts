export type WorkspaceNode = {
  id: string;
  label: string;
  description: string;
  children?: WorkspaceNode[];
};

/**
 * Canonical navigation ontology for the Iris application.
 *
 * This is intentionally a tree rather than a fixed page list. A node may
 * acquire deeper descendants as the evidence model and intelligence surface
 * expand. UI routing should derive from this registry instead of imposing a
 * product-wide page-count ceiling.
 */
export const irisWorkspaceRegistry: WorkspaceNode[] = [
  {
    id: "money",
    label: "Money",
    description: "Financial objects and their state",
    children: [
      { id: "money/overview", label: "Overview", description: "Current financial structure" },
      { id: "money/accounts", label: "Accounts", description: "Connected accounts" },
      { id: "money/accounts/detail", label: "Account detail", description: "Account-level observations and relationships" },
      { id: "money/assets", label: "Assets", description: "Observed assets" },
      { id: "money/liabilities", label: "Liabilities", description: "Observed liabilities" },
      { id: "money/timeline", label: "Timeline", description: "Financial state through time" },
    ],
  },
  {
    id: "cashflow",
    label: "Cash Flow",
    description: "Movement, liquidity and forward state",
    children: [
      { id: "cashflow/overview", label: "Overview", description: "Observed inflows and outflows" },
      { id: "cashflow/inflows", label: "Inflows", description: "Observed incoming movement" },
      { id: "cashflow/outflows", label: "Outflows", description: "Observed outgoing movement" },
      { id: "cashflow/calendar", label: "Calendar", description: "Financial events by date" },
      { id: "cashflow/forecast", label: "Forecast", description: "Evidence-based forward model" },
      { id: "cashflow/liquidity", label: "Liquidity", description: "Available financial capacity" },
    ],
  },
  {
    id: "spending",
    label: "Spending",
    description: "Observed behavior and economic classification",
    children: [
      { id: "spending/overview", label: "Overview", description: "Current spending state" },
      { id: "spending/categories", label: "Categories", description: "Category-level behavior" },
      { id: "spending/merchants", label: "Merchants", description: "Merchant relationships" },
      { id: "spending/trends", label: "Trends", description: "Change through time" },
      { id: "spending/transactions", label: "Transactions", description: "Observed transaction history" },
      { id: "spending/anomalies", label: "Anomalies", description: "Unusual observed behavior" },
      { id: "spending/classification", label: "Classification", description: "Evidence and uncertainty of economic meaning" },
    ],
  },
  {
    id: "obligations",
    label: "Bills & Obligations",
    description: "Recurring and expected commitments",
    children: [
      { id: "obligations/overview", label: "Overview", description: "Current obligation state" },
      { id: "obligations/upcoming", label: "Upcoming", description: "Expected future obligations" },
      { id: "obligations/calendar", label: "Calendar", description: "Expected pressure by date" },
      { id: "obligations/recurring", label: "Recurring", description: "Observed recurrence" },
      { id: "obligations/subscriptions", label: "Subscriptions", description: "Recurring subscription relationships" },
      { id: "obligations/changes", label: "Changes", description: "Observed obligation changes" },
    ],
  },
  {
    id: "income",
    label: "Income",
    description: "Observed income signals and timing",
    children: [
      { id: "income/overview", label: "Overview", description: "Current income state" },
      { id: "income/sources", label: "Sources", description: "Observed income sources" },
      { id: "income/history", label: "History", description: "Income observations through time" },
      { id: "income/recurrence", label: "Recurrence", description: "Observed income patterns" },
      { id: "income/stability", label: "Stability", description: "Evidence-backed stability signals" },
      { id: "income/timing", label: "Timing", description: "Timing relationships" },
    ],
  },
  {
    id: "debt",
    label: "Debt",
    description: "Credit and repayment state",
    children: [
      { id: "debt/overview", label: "Overview", description: "Current debt state" },
      { id: "debt/credit", label: "Credit", description: "Observed credit relationships" },
      { id: "debt/utilization", label: "Utilization", description: "Calculated credit pressure" },
      { id: "debt/repayment", label: "Repayment", description: "Evidence-backed repayment state" },
      { id: "debt/payoff", label: "Payoff analysis", description: "Supported payoff analysis" },
    ],
  },
  {
    id: "networth",
    label: "Net Worth",
    description: "Assets, liabilities and change",
    children: [
      { id: "networth/overview", label: "Overview", description: "Current net-worth state" },
      { id: "networth/history", label: "History", description: "State through time" },
      { id: "networth/drivers", label: "Drivers", description: "Observed and calculated contributors" },
    ],
  },
  {
    id: "iris",
    label: "Iris",
    description: "Understanding, reasoning and decisions",
    children: [
      { id: "iris/briefing", label: "Briefing", description: "What matters now" },
      { id: "iris/findings", label: "Findings", description: "Risks, opportunities and changes" },
      { id: "iris/timeline", label: "Financial timeline", description: "Cross-domain relationships through time" },
      { id: "iris/explain", label: "Explain", description: "Why a conclusion exists" },
      { id: "iris/forecast", label: "Forecast", description: "Forward-looking reasoning" },
      { id: "iris/scenarios", label: "Scenarios", description: "Supported what-if analysis" },
      { id: "iris/decisions", label: "Decisions", description: "Decision support" },
      { id: "iris/education", label: "Education", description: "Understand the concepts behind your state" },
    ],
  },
  {
    id: "data",
    label: "Data & Plaid",
    description: "Provider boundary, coverage and provenance",
    children: [
      { id: "data/overview", label: "Overview", description: "Provider data boundary" },
      { id: "data/products", label: "Products", description: "Plaid product state" },
      { id: "data/evidence", label: "Evidence", description: "Source, freshness and lineage" },
      { id: "data/coverage", label: "Coverage", description: "Observed versus unavailable evidence" },
      { id: "data/sync", label: "Sync history", description: "Provider synchronization" },
    ],
  },
];

export function flattenWorkspaceRegistry(nodes: WorkspaceNode[] = irisWorkspaceRegistry): WorkspaceNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenWorkspaceRegistry(node.children) : [])]);
}

export function findWorkspace(id: string): WorkspaceNode | undefined {
  return flattenWorkspaceRegistry().find((node) => node.id === id);
}

export function workspaceChildren(id: string): WorkspaceNode[] {
  return irisWorkspaceRegistry.find((node) => node.id === id)?.children ?? [];
}
