import { formatInTimeZone, toDate } from "date-fns-tz";

const DEFAULT_TIMEZONE = "Europe/London";

// Converts a stored UTC ISO timestamp (e.g. "2025-02-21T17:00:00Z") into the
// value a <input type="datetime-local"> needs to display that instant in the 
// given timezone (defaulting to London, UK).
export function toDatetimeLocalValue(iso: string, timeZone: string = DEFAULT_TIMEZONE): string {
  if (!iso) return "";
  return formatInTimeZone(iso, timeZone, "yyyy-MM-dd'T'HH:mm");
}

// Converts a <input type="datetime-local"> value (e.g. "2025-02-21T17:00")
// back to a UTC ISO timestamp (e.g. "2025-02-21T17:00:00Z"), interpreting
// the local digits as belonging to the given timezone instead of the user's
// browser timezone.
export function fromDatetimeLocalValue(localString: string, timeZone: string = DEFAULT_TIMEZONE): string {
  if (!localString) return "";
  return toDate(localString, { timeZone }).toISOString();
}
