export const CANONICAL_PLAID_PRODUCTS = [
  "auth",
  "transactions",
  "balance",
  "identity",
  "assets",
  "liabilities",
  "investments",
  "statements",
] as const;

export type PlaidProductCombination = {
  id: string;
  products: string[];
  size: number;
};

export type PlaidProductSequence = {
  id: string;
  order: string[];
  size: number;
};

function permutations(values: string[]): string[][] {
  if (values.length <= 1) return [values];
  const result: string[][] = [];
  for (let i = 0; i < values.length; i += 1) {
    const rest = values.slice(0, i).concat(values.slice(i + 1));
    for (const tail of permutations(rest)) result.push([values[i], ...tail]);
  }
  return result;
}

/**
 * Enumerates the complete non-empty subset and ordered-sequence spaces for
 * the eight canonical Plaid domains. This is a planning space, not a claim
 * that every product is currently consented, supported, or observed.
 */
export function buildPlaidProductComposition(observedProducts: string[] = []) {
  const observed = new Set(observedProducts);
  const combinations: PlaidProductCombination[] = [];
  const sequences: PlaidProductSequence[] = [];

  for (let mask = 1; mask < (1 << CANONICAL_PLAID_PRODUCTS.length); mask += 1) {
    const products = CANONICAL_PLAID_PRODUCTS.filter((_, index) => Boolean(mask & (1 << index)));
    combinations.push({ id: `subset:${products.join("+")}`, products: [...products], size: products.length });
    for (const order of permutations([...products])) sequences.push({ id: `sequence:${order.join("->")}`, order, size: order.length });
  }

  const readyCombinations = combinations.filter(c => c.products.every(product => observed.has(product)));
  const readySequences = sequences.filter(s => s.order.every(product => observed.has(product)));

  return {
    architecture_version: "IRIS_PLAID_PRODUCT_COMPOSITION_V1",
    canonical_products: [...CANONICAL_PLAID_PRODUCTS],
    counts: {
      canonical_products: CANONICAL_PLAID_PRODUCTS.length,
      non_empty_combinations: combinations.length,
      ordered_sequences: sequences.length,
      currently_observed_combinations: readyCombinations.length,
      currently_observed_sequences: readySequences.length,
    },
    composition_space: {
      combinations,
      ordered_sequences: sequences,
    },
    observed_products: [...observed].filter(product => CANONICAL_PLAID_PRODUCTS.includes(product as typeof CANONICAL_PLAID_PRODUCTS[number])),
    rules: [
      "All non-empty combinations of the canonical Plaid products are representable.",
      "All permutations of every combination are representable.",
      "Consent, institution support, and observation state gate what Iris may actually evaluate.",
      "The theoretical composition space never becomes financial evidence by itself.",
      "Products are capability inputs/views, not intelligence architecture tiers.",
      "No financial values, provider observations, or actions are fabricated or executed by this planner.",
    ],
  };
}
