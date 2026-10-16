// Presentation helpers shared by the Server Components that read the database
// and the client views that render the result. Everything is deterministic —
// UTC and a fixed locale — so the server and the first client render produce
// byte-identical strings and cannot drift into a hydration mismatch. That is
// also why a value that cannot be parsed is echoed back verbatim instead of
// being quietly replaced by today's date.

// "RM 7.00 per day", "RM 50.00 per hour" — the unit is stored snake_cased
// ("per_day") and read back with its underscores opened up.
export function priceLabel(price: number, unit: string | null): string {
  return `RM ${price.toFixed(2)} ${(unit ?? "flat_rate").replace(/_/g, " ")}`;
}

// SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC. Date understands the ISO form
// once the space becomes a T, and the trailing Z pins it to UTC rather than
// letting the server's local zone shift the string.
function parse(value: string): Date | null {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
};

/** "18 Oct 2026" */
export function formatDate(value: string): string {
  return parse(value)?.toLocaleDateString("en-GB", DATE_OPTIONS) ?? value;
}

/** "18 Oct 2026, 08:30" */
export function formatDateTime(value: string): string {
  const date = parse(value);
  if (!date) return value;
  return `${date.toLocaleDateString("en-GB", DATE_OPTIONS)}, ${date.toLocaleTimeString("en-GB", TIME_OPTIONS)}`;
}

/**
 * An event's window as one label: "18 Oct 2026, 08:30 – 13:00" when it starts
 * and ends on the same day, otherwise both timestamps in full.
 */
export function formatEventRange(start: string, end: string): string {
  const from = parse(start);
  const to = parse(end);
  if (!from || !to) return `${start} – ${end}`;

  const sameDay =
    from.toLocaleDateString("en-GB", DATE_OPTIONS) ===
    to.toLocaleDateString("en-GB", DATE_OPTIONS);
  if (!sameDay) return `${formatDateTime(start)} – ${formatDateTime(end)}`;

  return `${formatDate(start)}, ${from.toLocaleTimeString("en-GB", TIME_OPTIONS)} – ${to.toLocaleTimeString("en-GB", TIME_OPTIONS)}`;
}
