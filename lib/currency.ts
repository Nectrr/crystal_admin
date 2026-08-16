// Mirrors the Go backend's currencySymbols map (internal/tickets/email.go) —
// keep the two in sync if a new currency is added. Falls back to the
// uppercased code itself (e.g. "NGN") for anything not in the map, rather
// than guessing a symbol or defaulting to £.
const CURRENCY_SYMBOLS: Record<string, string> = {
  gbp: "£",
  usd: "$",
  eur: "€",
  ngn: "₦",
};

export function currencySymbol(code?: string | null): string {
  if (!code) return "£";
  return CURRENCY_SYMBOLS[code.toLowerCase()] ?? code.toUpperCase();
}

export function formatMoney(pricePence: number, currency?: string | null): string {
  return `${currencySymbol(currency)}${(pricePence / 100).toFixed(2)}`;
}
