import { apiFetchJson } from "@/lib/auth";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; email: string; fullName?: string | null };
};

export function listCourseAnnouncements(courseId: string) {
  return apiFetchJson<Announcement[]>(`/announcements/course/${courseId}`);
}

export function createCourseAnnouncement(courseId: string, data: { title: string; content: string }) {
  return apiFetchJson<Announcement>(`/announcements/course/${courseId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateAnnouncement(id: string, data: { title?: string; content?: string }) {
  return apiFetchJson<Announcement>(`/announcements/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteAnnouncement(id: string) {
  return apiFetchJson<{ ok: true }>(`/announcements/${id}`, { method: "DELETE" });
}
