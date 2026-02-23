import { apiFetch } from "./auth";
import { apiFetchJson } from "./auth";

export type CourseResource = {
  id: string;
  title: string;
  description: string | null;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  teacher?: { id: string; fullName: string; email: string };
};

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
