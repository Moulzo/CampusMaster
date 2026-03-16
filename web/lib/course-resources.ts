import { apiFetch } from "./auth";
import { apiFetchJson } from "./auth";

export type UserLite = { id: string; fullName: string | null; email: string };

export type CourseResource = {
  id: string;
  title: string;
  description: string | null;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  downloadCount: number;
  viewCount: number;

  // ✅ API renvoie "uploadedBy"
  uploadedBy: UserLite | null;
};

// Helper functions
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('video')) return '🎥';
  return '📎';
}

export function listCourseResources(courseId: string) {
  return apiFetchJson<CourseResource[]>(`/courses/${courseId}/resources`);
}

export async function uploadCourseResource(courseId: string, data: { title: string; description?: string; file: File }) {
  const form = new FormData();
  form.append("title", data.title);
  if (data.description) form.append("description", data.description);
  form.append("file", data.file);

  const res = await apiFetch(`/courses/${courseId}/resources`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return (await res.json()) as CourseResource;
}

export function downloadCourseResourceUrl(resourceId: string) {
  // apiFetch ne marche pas pour "download fichier" via JS facilement,
  // le plus simple: ouvrir l'URL dans un nouvel onglet
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
  return `${API_URL}/courses/resources/${resourceId}/download`;
}

export async function downloadCourseResource(resourceId: string, filename?: string) {
  const res = await apiFetch(`/courses/resources/${resourceId}/download`, {
    method: "GET",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }

  const blob = await res.blob();

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? "support";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function deleteCourseResource(resourceId: string) {
  const res = await apiFetch(`/courses/resources/${resourceId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function trackCourseResourceView(resourceId: string): Promise<void> {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    const msg = "❌ Pas de token d'accès trouvé. Veuillez vous reconnecter.";
    console.error(msg);
    throw new Error(msg);
  }
  
  try {
    await apiFetchJson(`/courses/resources/${resourceId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch (error: any) {
    console.error("Erreur trackCourseResourceView:", error);
    throw error;
  }
}

export function getCourseResourceDownloadUrl(resourceId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
  return `${baseUrl}/courses/resources/${resourceId}/download`;
}
