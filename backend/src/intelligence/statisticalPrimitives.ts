export interface RobustStatistics {
  sampleSize: number;
  mean: number | null;
  median: number | null;
  mad: number | null;
  standardDeviation: number | null;
  coefficientOfVariation: number | null;
  q1: number | null;
  q3: number | null;
  lowerReference: number | null;
  upperReference: number | null;
  adaptiveThreshold: number | null;
  method: "median_mad" | "insufficient_evidence";
}

export interface AdaptiveBaseline {
  sampleSize: number;
  center: number | null;
  dispersion: number | null;
  lowerReference: number | null;
  upperReference: number | null;
  currentValue: number | null;
  deviation: number | null;
  modifiedZ: number | null;
  status: "established" | "limited" | "insufficient_evidence";
  limitation: string | null;
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function quantile(values: readonly number[], probability: number): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  if (ordered.length === 1) return ordered[0];
  const position = (ordered.length - 1) * Math.min(1, Math.max(0, probability));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return ordered[lower];
  return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower);
}

export function robustStatistics(values: readonly number[]): RobustStatistics {
  const finite = values.filter(Number.isFinite).map(Number);
  const center = median(finite);
  if (center === null) return {
    sampleSize: 0, mean: null, median: null, mad: null, standardDeviation: null,
    coefficientOfVariation: null, q1: null, q3: null, lowerReference: null,
    upperReference: null, adaptiveThreshold: null, method: "insufficient_evidence",
  };

  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  const variance = finite.length > 1
    ? finite.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (finite.length - 1)
    : null;
  const standardDeviation = variance === null ? null : Math.sqrt(variance);
  const mad = median(finite.map(value => Math.abs(value - center)));
  const q1 = quantile(finite, 0.25);
  const q3 = quantile(finite, 0.75);

  if (finite.length < 2 || mad === null || q1 === null || q3 === null) return {
    sampleSize: finite.length,
    mean: round(mean), median: round(center), mad: null,
    standardDeviation: standardDeviation === null ? null : round(standardDeviation),
    coefficientOfVariation: mean !== 0 && standardDeviation !== null ? round(standardDeviation / Math.abs(mean)) : null,
    q1: q1 === null ? null : round(q1), q3: q3 === null ? null : round(q3),
    lowerReference: null, upperReference: null, adaptiveThreshold: null,
    method: "insufficient_evidence",
  };

  const scale = mad === 0 ? Math.max(Math.abs(center) * 0.1, 0.01) : mad;
  const adaptiveThreshold = 3 * scale;
  return {
    sampleSize: finite.length,
    mean: round(mean), median: round(center), mad: round(mad),
    standardDeviation: standardDeviation === null ? null : round(standardDeviation),
    coefficientOfVariation: mean !== 0 && standardDeviation !== null ? round(standardDeviation / Math.abs(mean)) : null,
    q1: round(q1), q3: round(q3),
    lowerReference: round(Math.max(0, center - adaptiveThreshold)),
    upperReference: round(center + adaptiveThreshold),
    adaptiveThreshold: round(adaptiveThreshold),
    method: "median_mad",
  };
}

export function buildAdaptiveBaseline(values: readonly number[], currentValue?: number | null): AdaptiveBaseline {
  const finite = values.filter(Number.isFinite).map(Number);
  const stats = robustStatistics(finite);
  const current = currentValue !== undefined ? currentValue : finite.at(-1) ?? null;
  const status: AdaptiveBaseline["status"] = stats.sampleSize >= 2 && stats.median !== null && stats.mad !== null
    ? "established"
    : finite.length === 1
      ? "limited"
      : "insufficient_evidence";
  const deviation = current !== null && stats.median !== null ? round(current - stats.median) : null;
  const modifiedZ = current !== null && stats.median !== null && stats.mad !== null && stats.mad > 0
    ? round(0.67448975 * (current - stats.median) / stats.mad)
    : null;
  return {
    sampleSize: finite.length,
    center: stats.median,
    dispersion: stats.mad,
    lowerReference: status === "established" ? stats.lowerReference : null,
    upperReference: status === "established" ? stats.upperReference : null,
    currentValue: current === null ? null : round(current),
    deviation,
    modifiedZ,
    status,
    limitation: status === "established" ? null : "At least two observed values are required to establish an adaptive historical reference; missing observations are not converted to zero.",
  };
}

export function isRobustOutlier(value: number, baseline: AdaptiveBaseline, threshold = 3.5): boolean {
  return baseline.status === "established" && baseline.modifiedZ !== null && Math.abs(baseline.modifiedZ) >= threshold;
}
