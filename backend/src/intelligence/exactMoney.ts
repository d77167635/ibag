/** Exact internal monetary arithmetic for Iris calculations. */
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
  const count = BigInt(values.length);
  return centsToNumber(total / count) + Number(total % count) / Number(count) / 100;
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a < 0n ? -a : a;
}

function lcm(a: bigint, b: bigint): bigint {
  return (a / gcd(a, b)) * b;
}

/** Average of per-day rates while retaining integer-cent arithmetic until final conversion. */
export function averageDailyRate(values: readonly { cents: Cents; days: number }[]): number {
  if (!values.length) return 0;
  const denominator = values.reduce((acc, value) => lcm(acc, BigInt(value.days)), 1n);
  const numerator = values.reduce((sum, value) => sum + value.cents * (denominator / BigInt(value.days)), 0n);
  const divisor = denominator * BigInt(values.length);
  return Number(numerator / divisor) / 100 + Number(numerator % divisor) / Number(divisor) / 100;
}
