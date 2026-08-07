const ISO_RESOURCE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseResourceDate(value: unknown): Date {
  if (typeof value !== "string" || !ISO_RESOURCE_DATE_PATTERN.test(value)) {
    throw new TypeError("Resource date must use the YYYY-MM-DD format");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new RangeError("Resource date must be a valid calendar date");
  }

  return date;
}

export function formatResourceDate({
  date,
  locale,
}: {
  date: Date;
  locale: string;
}): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
