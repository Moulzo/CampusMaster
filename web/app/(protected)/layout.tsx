"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, getRefreshToken, logout } from "@/lib/auth";
import { AuthProvider, AuthUser } from "@/lib/auth-context";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    // 1) pas de refresh token => pas loggé
    if (!getRefreshToken()) {
      const next = encodeURIComponent(pathname || "/student");
      router.replace(`/login?next=${next}`);
      return;
    }

    // 2) sinon on vérifie la session
    (async () => {
      try {
        const res = await apiFetch("http://localhost:3001/api/auth/me", { cache: "no-store" });

        if (res.status === 401) {
          logout();
          return;
        }

        if (!res.ok) {
          const txt = await res.text();
          if (!cancelled) setError(txt || `HTTP ${res.status}`);
          return;
        }

        const data = await res.json(); // { user: ... }
        if (!cancelled) {
          setUser(data?.user ?? null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (error) return <pre style={{ padding: 24, color: "tomato" }}>{error}</pre>;
  if (loading) return <p style={{ padding: 24 }}>Chargement...</p>;

  return (
    <AuthProvider user={user} loading={false}>
      {children}
    </AuthProvider>
  );
}
