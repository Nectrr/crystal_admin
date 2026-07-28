import { apiFetch } from "./client";

export interface LoginResponse {
  token: string;
  refresh_token: string;
  expires_at: string;
  user?: { id: string; email: string };
}

export interface MeResponse {
  id: string;
  email: string;
}

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function refresh(refresh_token: string) {
  return apiFetch<LoginResponse>("/api/auth/refresh", {
    method: "POST",
    body: { refresh_token },
  });
}

export function logout(refresh_token?: string | null) {
  return apiFetch<void>("/api/admin/auth/logout", {
    method: "POST",
    body: refresh_token ? { refresh_token } : undefined,
  });
}

export function me() {
  return apiFetch<MeResponse>("/api/admin/auth/me", { method: "GET" });
}

export function createAdminUser(email: string, password: string) {
  return apiFetch<{ message: string }>("/api/admin/auth/users", {
    method: "POST",
    body: { email, password },
  });
}
