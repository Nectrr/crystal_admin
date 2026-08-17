// Converts a stored UTC ISO timestamp (e.g. "2025-02-21T17:00:00Z") into the
// value a <input type="datetime-local"> needs to actually display that same
// instant in the browser's local timezone.
//
// A naive `iso.slice(0, 16)` looks right but is a bug: datetime-local values
// have no timezone of their own — the browser treats them as literal
// wall-clock digits — so slicing a UTC string just relabels a UTC time as if
// it were local, silently shifting it by the browser's UTC offset every time
// the field is redisplayed. Left uncorrected, that shifted value then gets
// re-converted to UTC on save (via `new Date(value).toISOString()`, which
// *does* correctly assume the input is local time), so the stored instant
// drifts by one more offset on every edit — this is why an event time that
// "keeps fluctuating" after being edited a few times.
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}
