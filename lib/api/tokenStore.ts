const STORAGE_KEY = "cc_auth_tokens";

interface StoredTokens {
  token: string;
  refresh_token: string;
  expires_at: string;
}

let tokens: StoredTokens | null = null;
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    tokens = raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    tokens = null;
  }
}

export function setTokens(next: StoredTokens) {
  tokens = next;
  hydrated = true;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors (private browsing etc.)
  }
}

export function clearTokens() {
  tokens = null;
  hydrated = true;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getAccessToken(): string | null {
  hydrate();
  return tokens?.token ?? null;
}

export function getRefreshToken(): string | null {
  hydrate();
  return tokens?.refresh_token ?? null;
}

export function getExpiresAt(): string | null {
  hydrate();
  return tokens?.expires_at ?? null;
}
