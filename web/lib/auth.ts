const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

/**
 * Event global pour prévenir l'app qu'il y a eu login/logout.
 * (React ne rerender pas automatiquement sur changement localStorage)
 */
export const AUTH_EVENT = "campusmaster:auth";

type AuthEventDetail =
  | { type: "tokens:set" }
  | { type: "tokens:cleared"; reason?: string }; // ✅ Ajout du reason

function emitAuthEvent(detail: AuthEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AuthEventDetail>(AUTH_EVENT, { detail }));
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

export function setTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  emitAuthEvent({ type: "tokens:set" });
}

// ✅ Ajout du paramètre reason pour distinguer logout volontaire vs session expirée
export function clearTokens(reason?: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  emitAuthEvent({ type: "tokens:cleared", reason }); // ✅ Passe le reason
}

// Single-flight pattern pour éviter les refresh simultanés
let refreshPromise: Promise<boolean> | null = null;

export async function refreshTokens(): Promise<boolean> {
  // Si un refresh est déjà en cours, retourner la même promesse
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  refreshPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) return false;

      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Refresh timeout');
      } else {
        console.warn('Refresh failed:', error);
      }
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// fetch qui retente un refresh si 401
export async function apiFetch(input: string, init: RequestInit = {}) {
  const accessToken = getAccessToken();

  const headers = new Headers(init.headers || {});
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  // ✅ construit une vraie URL backend
  const url =
    input.startsWith("http")
      ? input
      : `${API_URL}${input.startsWith("/") ? input : `/${input}`}`;

  let res = await fetch(url, { ...init, headers, cache: "no-store" });

  // ✅ Gestion du 401 avec refresh automatique
  if (res.status !== 401) return res;

  const ok = await refreshTokens();
  if (!ok) return res;

  const accessToken2 = getAccessToken();
  const headers2 = new Headers(init.headers || {});
  if (accessToken2) headers2.set("Authorization", `Bearer ${accessToken2}`);

  res = await fetch(url, { ...init, headers: headers2, cache: "no-store" });
  return res;
}

// ✅ helper pratique : renvoie directement le JSON ou throw une erreur lisible
export async function apiFetchJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(input, init);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }

  // 204 No Content => pas de JSON
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function logout() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    // ✅ Indique que c'est un logout volontaire (pas une session expirée)
    clearTokens("logout");
  }
}
