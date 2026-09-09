/** Exact internal monetary arithmetic for Iris calculations.
 * Database monetary values remain authoritative; this utility prevents floating-point
 * accumulation during derived calculations and converts to number only at the API boundary.
 */
export type Cents = bigint;

export function toCents(value: number | string): Cents {
  const text = String(value).trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) throw new Error(`INVALID_MONEY_VALUE: ${text}`);
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ""] = unsigned.split(".");
  const centsFraction = fraction.padEnd(2, "0").slice(0, 2);
  const thirdDigit = fraction[2] ? Number(fraction[2]) : 0;
  let cents = BigInt(whole) * 100n + BigInt(centsFraction || "0");
  if (thirdDigit >= 5) cents += 1n;
  return negative ? -cents : cents;
}

export function centsToNumber(cents: Cents): number {
  return Number(cents) / 100;
}

export function averageCents(values: readonly Cents[]): number {
  if (!values.length) return 0;
  const total = values.reduce((sum, value) => sum + value, 0n);
  const quotient = total / BigInt(values.length);
  const remainder = total % BigInt(values.length);
  const signedRemainder = Number(remainder) / values.length;
  return centsToNumber(quotient) + signedRemainder / 100;
}
