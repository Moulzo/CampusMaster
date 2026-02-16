"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AUTH_EVENT,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "@/lib/auth";

const API_URL = "http://localhost:3001/api";

export type Role = "STUDENT" | "TEACHER" | "ADMIN";
export type AuthUser = { id: string; email: string; fullName: string; role: Role };

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  reload: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

async function callMe(accessToken: string) {
  return fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  if (!res.ok) return false;
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return true;
}

export function AuthProvider({
  children,
  user: initialUser,
  loading: initialLoading,
}: {
  children: React.ReactNode;
  user?: AuthUser | null;
  loading?: boolean;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
  const [loading, setLoading] = useState(initialLoading ?? true);

  const reload = async () => {
    setLoading(true);
    try {
      const access = getAccessToken();
      if (!access) {
        setUser(null);
        return;
      }

      let res = await callMe(access);

      // access expiré => refresh 1 fois
      if (res.status === 401) {
        const ok = await tryRefresh();
        if (!ok) {
          setUser(null);
          clearTokens();
          return;
        }
        const access2 = getAccessToken();
        if (!access2) {
          setUser(null);
          clearTokens();
          return;
        }
        res = await callMe(access2);
      }

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data.user as AuthUser);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  // 🔥 écoute login/logout pour éviter états "fantômes"
  useEffect(() => {
    const onAuth = (e: Event) => {
      const ce = e as CustomEvent<any>;
      const type = ce?.detail?.type as string | undefined;

      if (type === "tokens:cleared") {
        setUser(null);
        setLoading(false);
      }

      if (type === "tokens:set") {
        reload();
      }
    };

    window.addEventListener(AUTH_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_EVENT, onAuth);
  }, []);

  const value = useMemo(() => ({ user, loading, reload }), [user, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
