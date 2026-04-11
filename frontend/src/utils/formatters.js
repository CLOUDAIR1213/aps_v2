const fullDateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const shortDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const clockFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

export function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value) {
  const parsed = parseDate(value);
  return parsed ? fullDateTimeFormatter.format(parsed) : "--";
}

export function formatDate(value) {
  const parsed = parseDate(value);
  return parsed ? shortDateFormatter.format(parsed) : "--";
}

export function formatClock(value) {
  const parsed = parseDate(value);
  return parsed ? clockFormatter.format(parsed) : "--";
}

export function getDurationHours(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);

  if (!start || !end) {
    return 0;
  }

  return Math.max((end.getTime() - start.getTime()) / 3600000, 0);
}

export function formatHours(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  const precision = value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)}h`;
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return `${Math.round(value)}%`;
}

export function getDeadlineTone(value) {
  const parsed = parseDate(value);

  if (!parsed) {
    return "neutral";
  }

  const delta = parsed.getTime() - Date.now();

  if (delta < 0) {
    return "danger";
  }

  if (delta <= 48 * 3600000) {
    return "warning";
  }

  return "success";
}

export function formatDeadlineLabel(value) {
  const parsed = parseDate(value);

  if (!parsed) {
    return "--";
  }

  const delta = parsed.getTime() - Date.now();

  if (delta < 0) {
    return "\u5df2\u903e\u671f";
  }

  const hours = delta / 3600000;

  if (hours < 24) {
    return `${Math.max(Math.round(hours), 1)}h`;
  }

  return `${Math.round(hours / 24)}d`;
}
