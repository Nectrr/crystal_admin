import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./tokenStore";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080";

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details?: string[];
  trace_id?: string;
}

export class ApiError extends Error {
  code: string;
  details?: string[];
  trace_id?: string;
  status: number;

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.message || "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.code = envelope.code || "UNKNOWN_ERROR";
    this.details = envelope.details;
    this.trace_id = envelope.trace_id;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** When true, body is sent as-is (e.g. a FormData instance) without JSON stringify/headers. */
  isFormData?: boolean;
  /** Internal: set on the retried request after a refresh, to prevent infinite refresh loops. */
  _isRetry?: boolean;
}

// Auth endpoints that must never get an Authorization header attached (they predate having a token).
const NO_AUTH_HEADER_PATHS = ["/api/auth/login", "/api/auth/refresh"];

/**
 * Central fetch wrapper for all /api/admin/* (and /api/auth/*) calls.
 * Attaches `Authorization: Bearer <token>` from the in-memory token store.
 * On a 401 from an authenticated request, attempts one refresh-and-retry before giving up.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, isFormData, headers, _isRetry, ...rest } = options;

  const skipAuthHeader = NO_AUTH_HEADER_PATHS.includes(path);
  const accessToken = skipAuthHeader ? null : getAccessToken();

  const init: RequestInit = {
    ...rest,
    headers: {
      ...(isFormData ? {} : body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: "Could not reach the server. Check your connection and try again.",
    });
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? safeJsonParse(text) : undefined;

  if (!res.ok) {
    const envelope: ApiErrorEnvelope =
      data && typeof data === "object"
        ? (data as ApiErrorEnvelope)
        : { code: "UNKNOWN_ERROR", message: res.statusText || "Request failed" };

    if (res.status === 401 && !skipAuthHeader && !_isRetry) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return apiFetch<T>(path, { ...options, _isRetry: true });
      }
      clearTokens();
    }

    if (envelope.trace_id) {
      // eslint-disable-next-line no-console
      console.error(`[API ${res.status}] ${envelope.code}: ${envelope.message} (trace_id=${envelope.trace_id})`);
    } else {
      // eslint-disable-next-line no-console
      console.error(`[API ${res.status}] ${envelope.code}: ${envelope.message}`);
    }

    throw new ApiError(res.status, envelope);
  }

  return data as T;
}

let refreshInFlight: Promise<boolean> | null = null;

/** Calls /api/auth/refresh directly (bypassing apiFetch) to avoid recursive 401 handling. */
function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setTokens({ token: data.token, refresh_token: data.refresh_token, expires_at: data.expires_at });
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function buildQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}
