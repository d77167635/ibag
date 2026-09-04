import React from "react";

export type TemporalContextProps = {
  date?: string | Date | null;
  label?: string;
  context?: string;
  endDate?: string | Date | null;
  tone?: "default" | "muted" | "strong";
};

function parse(value?: string | Date | null) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export function TemporalContext({ date, endDate, label = "Date", context, tone = "default" }: TemporalContextProps) {
  const start = parse(date);
  const end = parse(endDate);
  if (!start) return <span className={`temporal-context temporal-${tone}`}><b>{label}</b><span>Not available</span></span>;

  const dateText = dateFormatter.format(start);
  const timeText = timeFormatter.format(start);
  const range = end ? `${dateText} – ${dateFormatter.format(end)}` : dateText;

  return (
    <span className={`temporal-context temporal-${tone}`} title={`${label}: ${dateText}${context ? ` · ${context}` : ""}`}>
      <b>{label}</b>
      <strong>{range}</strong>
      <small>{timeText}{context ? ` · ${context}` : ""}</small>
    </span>
  );
}

export function DateExplanation({ date, label = "When", context }: TemporalContextProps) {
  return <TemporalContext date={date} label={label} context={context} tone="muted" />;
}
