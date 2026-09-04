import { PLAID_PRODUCT_CATALOG_V2 } from "./plaidProductCatalogV2.js";
import { PLAID_ITEM_PRODUCT_STATES } from "./plaidItemProductStates.js";

export type PlaidCapabilityScope = "item_product_state" | "public_product_surface";

/**
 * Auditable registry boundary for Iris.
 *
 * A capability is catalog metadata only until Plaid runtime state and actual
 * domain evidence establish what is available to a particular user/Item.
 */
export interface PlaidCapabilityRecord {
  key: string;
  displayName: string;
  category: string;
  description: string;
  scope: PlaidCapabilityScope;
  plaidProductStates: string[];
  phase1Relevant: boolean;
  moneyMovement: boolean;
  irisCapabilities: string[];
}

const itemStates = new Set<string>(PLAID_ITEM_PRODUCT_STATES);

function moneyMovementFor(definition: (typeof PLAID_PRODUCT_CATALOG_V2)[number]): boolean {
  return definition.irisCapabilities.includes("money_movement") ||
    definition.irisCapabilities.includes("payments");
}

/**
 * Deduplicates catalog aliases while preserving every documented Item state.
 * Public Plaid services that are not Item product-state identifiers remain in
 * the registry but are explicitly marked public_product_surface.
 */
export const PLAID_CAPABILITY_REGISTRY: readonly PlaidCapabilityRecord[] =
  PLAID_PRODUCT_CATALOG_V2.map((definition) => ({
    key: definition.key,
    displayName: definition.displayName,
    category: definition.category,
    description: definition.description,
    scope: definition.plaidProductStates.some((state) => itemStates.has(state))
      ? "item_product_state"
      : "public_product_surface",
    plaidProductStates: [...definition.plaidProductStates],
    phase1Relevant: definition.phase1Relevant,
    moneyMovement: moneyMovementFor(definition),
    irisCapabilities: [...definition.irisCapabilities],
  }));

export const PLAID_ITEM_STATE_COVERAGE = PLAID_ITEM_PRODUCT_STATES.map((state) => ({
  state,
  catalogKeys: PLAID_CAPABILITY_REGISTRY
    .filter((capability) => capability.plaidProductStates.includes(state))
    .map((capability) => capability.key),
}));

export const PLAID_UNMAPPED_ITEM_STATES = PLAID_ITEM_STATE_COVERAGE
  .filter((entry) => entry.catalogKeys.length === 0)
  .map((entry) => entry.state);
