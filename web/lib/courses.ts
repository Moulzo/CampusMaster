import { getAccessToken } from "./auth";

const API_URL = "http://localhost:3001/api";

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacher: {
    id: string;
    email: string;
    fullName: string;
  };
  students: Array<{
    id: string;
    email: string;
    fullName: string;
  }>;
}

function authHeaders() {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("Access token manquant (utilisateur non connecté).");
  }
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function getCourses(): Promise<Course[]> {
  const res = await fetch(`${API_URL}/courses`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to fetch courses: ${res.status}`);
  }
  return res.json();
}

export async function getCourse(id: string): Promise<Course> {
  const res = await fetch(`${API_URL}/courses/${id}`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to fetch course: ${res.status}`);
  }
  return res.json();
}

export async function createCourse(title: string, description?: string): Promise<Course> {
  const res = await fetch(`${API_URL}/courses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ title, description }),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to create course: ${res.status}`);
  }
  return res.json();
}

export async function updateCourse(id: string, title?: string, description?: string): Promise<Course> {
  const res = await fetch(`${API_URL}/courses/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ title, description }),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to update course: ${res.status}`);
  }
  return res.json();
}

export async function deleteCourse(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/courses/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to delete course: ${res.status}`);
  }
}

export async function enrollCourse(id: string): Promise<Course> {
  const res = await fetch(`${API_URL}/courses/${id}/enroll`, {
    method: "POST",
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to enroll: ${res.status}`);
  }
  return res.json();
}

export async function unenrollCourse(id: string): Promise<Course> {
  const res = await fetch(`${API_URL}/courses/${id}/unenroll`, {
    method: "POST",
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to unenroll: ${res.status}`);
  }
  return res.json();
}
