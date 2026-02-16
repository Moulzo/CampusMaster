"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch, getRefreshToken, logout, AUTH_EVENT } from "@/lib/auth";
import { AuthProvider, AuthUser } from "@/lib/auth-context";

const API_URL = "http://localhost:3001/api";

function buildLoginUrl(pathname: string | null) {
  const next = encodeURIComponent(pathname || "/student");
  return `/login?next=${next}`;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string>("");

  // ✅ Hard redirect, fiable à 100%
  const hardRedirectToLogin = () => {
    if (typeof window === "undefined") return;
    window.location.replace(buildLoginUrl(pathname));
  };

  // 🔥 Réagir immédiatement à un logout (tokens cleared)
  useEffect(() => {
    const onAuth = (e: Event) => {
      const ce = e as CustomEvent<any>;
      const type = ce?.detail?.type as string | undefined;

      if (type === "tokens:cleared") {
        setUser(null);
        setLoading(false);
        hardRedirectToLogin();
      }
    };

    window.addEventListener(AUTH_EVENT, onAuth);

    // Bonus: si un autre onglet supprime les tokens
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "refreshToken" && !ev.newValue) {
        setUser(null);
        setLoading(false);
        hardRedirectToLogin();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(AUTH_EVENT, onAuth);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    // pas de refresh token => login direct
    if (!getRefreshToken()) {
      setLoading(false);
      hardRedirectToLogin();
      return;
    }

    (async () => {
      try {
        const res = await apiFetch(`${API_URL}/auth/me`, { cache: "no-store" });

        if (res.status === 401) {
          await logout();
          if (!cancelled) {
            setUser(null);
            setLoading(false);
            hardRedirectToLogin();
          }
          return;
        }

        if (!res.ok) {
          const txt = await res.text();
          if (!cancelled) setError(txt || `HTTP ${res.status}`);
          return;
        }

        const data = await res.json();
        if (!cancelled) setUser(data?.user ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (error) return <pre style={{ padding: 24, color: "tomato" }}>{error}</pre>;
  if (loading) return <p style={{ padding: 24 }}>Chargement...</p>;

  return <AuthProvider user={user} loading={false}>{children}</AuthProvider>;
}
