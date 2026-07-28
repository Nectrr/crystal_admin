"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";
import type { MeResponse } from "@/lib/api/auth";
import { clearTokens, getRefreshToken, setTokens } from "@/lib/api/tokenStore";

interface AuthContextValue {
  user: MeResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PUBLIC_PATHS = ["/login"];
const SCANNER_HOME = "/orders/scan";
const SCANNER_ALLOWED_PATHS = ["/orders/scan", "/settings"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((expires_at: string) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    const expiryMs = new Date(expires_at).getTime();
    const now = Date.now();
    // refresh 60s before expiry, but no sooner than 5s from now
    const delay = Math.max(expiryMs - now - 60_000, 5_000);
    refreshTimer.current = setTimeout(async () => {
      const token = getRefreshToken();
      if (!token) return;
      try {
        const res = await authApi.refresh(token);
        setTokens(res);
        scheduleRefresh(res.expires_at);
      } catch {
        clearTokens();
        setUser(null);
      }
    }, delay);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch (err) {
      setUser(null);
      if (err instanceof ApiError && err.status === 401) {
        clearTokens();
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshUser();
      setLoading(false);
    })();
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));
    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }
    if (user && isPublic) {
      router.replace(user.role === "scanner" ? SCANNER_HOME : "/dashboard");
      return;
    }
    if (user && user.role === "scanner" && pathname) {
      const allowed = SCANNER_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
      if (!allowed) {
        router.replace(SCANNER_HOME);
      }
    }
  }, [loading, user, pathname, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      setTokens(res);
      scheduleRefresh(res.expires_at);
      await refreshUser();
    },
    [refreshUser, scheduleRefresh]
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      await authApi.logout(refreshToken);
    } finally {
      clearTokens();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
