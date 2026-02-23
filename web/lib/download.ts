import { getAccessToken } from "./auth";

function normalizeDownloadUrl(u: string) {
  // http://localhost:3001/uploads/xxx -> /uploads/xxx
  if (!u) return u;

  try {
    const parsed = new URL(u);
    if (parsed.pathname.startsWith("/uploads/")) return parsed.pathname;
    return parsed.pathname;
  } catch {
    // déjà relative
    return u;
  }
}

export async function downloadWithAuth(url: string, filename?: string) {
  const token = getAccessToken();
  const normalized = normalizeDownloadUrl(url);

  const res = await fetch(normalized, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Téléchargement impossible");

  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename ?? "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
