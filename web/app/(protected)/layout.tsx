"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, getRefreshToken, getAccessToken, AUTH_EVENT, clearTokens } from "@/lib/auth";
import { AuthProvider, AuthUser } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast";
import { NotificationPanel } from "@/components/notification-panel";
import { AppShell } from "@/lib/app-shell";

const API_URL = "http://localhost:3001/api";

function buildLoginUrl(pathname: string | null) {
  const next = encodeURIComponent(pathname || "/student");
  return `/login?next=${next}`;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);

  // ✅ Flag pour éviter double redirection
  const isRedirecting = useRef(false);

  const hardRedirectToLogin = (withNext: boolean) => {
    if (typeof window === "undefined") return;
    if (isRedirecting.current) return;
    
    isRedirecting.current = true;
    window.location.replace(withNext ? buildLoginUrl(pathname) : "/login");
  };

  // ✅ Fonction pour charger l'utilisateur
  const loadUser = async () => {
    setLoading(true);
    setError("");

    if (!getRefreshToken()) {
      setLoading(false);
      hardRedirectToLogin(true);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await apiFetch(`${API_URL}/auth/me`, { 
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 401) {
        // Session expirée
        clearTokens("expired");
        return;
      }

      if (!res.ok) {
        const txt = await res.text();
        setError(txt || `HTTP ${res.status}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setUser(data ?? null);
      setToken(getAccessToken());
      setLoading(false);
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setError("Délai d'attente dépassé");
      } else {
        setError(e?.message ?? "Erreur");
      }
      setLoading(false);
    }
  };

  // ✅ Charger l'utilisateur au montage
  useEffect(() => {
    loadUser();
  }, []); // ✅ Seulement au montage

  // ✅ Écouter les événements AUTH
  useEffect(() => {
    const onAuth = (e: Event) => {
      const ce = e as CustomEvent<any>;
      const type = ce?.detail?.type as string | undefined;
      const reason = ce?.detail?.reason as string | undefined;

      if (type === "tokens:cleared") {
        setUser(null);
        setToken(null);
        setLoading(false);
        hardRedirectToLogin(reason !== "logout");
      }

      if (type === "tokens:set") {
        // ✅ Nouveau login => recharger l'utilisateur
        setToken(getAccessToken());
        loadUser();
      }
    };

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === "refreshToken" && !ev.newValue) {
        setUser(null);
        setLoading(false);
        hardRedirectToLogin(true);
      }
    };

    window.addEventListener(AUTH_EVENT, onAuth);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(AUTH_EVENT, onAuth);
      window.removeEventListener("storage", onStorage);
    };
  }, [pathname]); // ✅ Inclure pathname pour que hardRedirectToLogin ait le bon pathname

  if (error) return <pre style={{ padding: 24, color: "tomato" }}>{error}</pre>;
  if (loading) return <p style={{ padding: 24 }}>Chargement...</p>;

  return (
    <AuthProvider user={user} loading={false}>
      <ToastProvider>
        <div className="h-screen bg-slate-50 overflow-hidden">
          {user && token && (
            <div className="fixed top-4 right-4 z-70">
              <NotificationPanel token={token} />
            </div>
          )}

          <AppShell>{children}</AppShell>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
