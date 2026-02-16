const API_URL = "http://localhost:3001/api";

export function getAccessToken() {
  return localStorage.getItem("accessToken");
}

export function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

export function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export async function refreshTokens(): Promise<boolean> {
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

// fetch qui retente un refresh si 401
export async function apiFetch(input: string, init: RequestInit = {}) {
  const accessToken = getAccessToken();

  const headers = new Headers(init.headers || {});
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let res = await fetch(input, { ...init, headers, cache: "no-store" });

  if (res.status !== 401) return res;

  // 401 => tenter refresh
  const ok = await refreshTokens();
  if (!ok) return res;

  const accessToken2 = getAccessToken();
  const headers2 = new Headers(init.headers || {});
  if (accessToken2) headers2.set("Authorization", `Bearer ${accessToken2}`);

  res = await fetch(input, { ...init, headers: headers2, cache: "no-store" });
  return res;
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
    clearTokens();
  }
}
