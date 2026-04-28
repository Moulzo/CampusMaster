import { getAccessToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function toAbsoluteFileUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/api/")) {
    return `${API_URL.replace(/\/api$/, "")}${url}`;
  }

  if (url.startsWith("/")) {
    return `${API_URL}${url}`;
  }

  return `${API_URL}/${url}`;
}

export function canPreviewInBrowser(mimeType?: string | null, fileName?: string | null) {
  const type = mimeType?.toLowerCase() ?? "";
  const name = fileName?.toLowerCase() ?? "";

  return (
    type.startsWith("image/") ||
    type === "application/pdf" ||
    name.endsWith(".pdf") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif")
  );
}

export async function openFileInBrowser(url: string) {
  const token = getAccessToken();
  const absoluteUrl = toAbsoluteFileUrl(url);

  const response = await fetch(absoluteUrl, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });

  if (!response.ok) {
    throw new Error("Impossible d'ouvrir le fichier.");
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);

  window.open(objectUrl, "_blank", "noopener,noreferrer");

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 60_000);
}
