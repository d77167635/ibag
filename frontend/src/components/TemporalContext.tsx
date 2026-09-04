import React from "react";

export type TemporalRole =
  | "occurred"
  | "observed"
  | "as_of"
  | "period"
  | "compared_with"
  | "expected"
  | "projected"
  | "changed"
  | "updated"
  | "effective"
  | "started"
  | "ended";

export type TemporalContextProps = {
  date?: string | number | Date | null;
  label?: string;
  context?: string;
  endDate?: string | number | Date | null;
  tone?: "default" | "muted" | "strong";
  role?: TemporalRole;
  source?: string;
  why?: string;
  relative?: boolean;
  withTime?: boolean;
};

const roleLabels: Record<TemporalRole, string> = {
  occurred: "Occurred",
  observed: "Observed",
  as_of: "As of",
  period: "Analysis period",
  compared_with: "Compared with",
  expected: "Expected",
  projected: "Projected",
  changed: "Changed",
  updated: "Updated",
  effective: "Effective",
  started: "Started",
  ended: "Ended",
};

function parse(value?: string | number | Date | null) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function relativeText(value: Date) {
  const delta = value.getTime() - Date.now();
  const minutes = Math.round(Math.abs(delta) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ${delta < 0 ? "ago" : "from now"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ${delta < 0 ? "ago" : "from now"}`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ${delta < 0 ? "ago" : "from now"}`;
  return dateFormatter.format(value);
}

export function TemporalContext({
  date,
  endDate,
  label,
  context,
  tone = "default",
  role,
  source,
  why,
  relative = false,
  withTime = false,
}: TemporalContextProps) {
  const start = parse(date);
  const end = parse(endDate);
  const resolvedRole = role ?? "occurred";
  const resolvedLabel = label ?? roleLabels[resolvedRole];

  if (!start) {
    return (
      <span className={`temporal-context temporal-${tone}`}>
        <b>{resolvedLabel}</b>
        <span>Date unavailable</span>
      </span>
    );
  }

  const startText = withTime ? dateTimeFormatter.format(start) : dateFormatter.format(start);
  const endText = end ? ` → ${dateFormatter.format(end)}` : "";
  const explanation = why ?? context;

  return (
    <span
      className={`temporal-context temporal-${tone}`}
      title={`${resolvedLabel}: ${startText}${endText}${explanation ? ` · ${explanation}` : ""}`}
    >
      <b>{resolvedLabel}</b>
      <strong>{startText}{endText}</strong>
      {relative && <small>{relativeText(start)}</small>}
      {context && <small>{context}</small>}
      {source && <small>Source: {source}</small>}
      {why && <small>Why: {why}</small>}
    </span>
  );
}

export function DateExplanation(props: TemporalContextProps) {
  return <TemporalContext {...props} role={props.role ?? "occurred"} tone={props.tone ?? "muted"} />;
}
