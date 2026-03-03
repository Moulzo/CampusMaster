import { getAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export type UserLite = {
  id: string;
  email: string;
  fullName: string | null;
};

export interface Course {
  id: string;
  title: string;
  description?: string | null;

  // ✅ nouveau modèle
  teachers: UserLite[];

  students: Array<{
    id: string;
    email: string;
    fullName: string | null;
  }>;
}

// helper (évite crash si teachers manquant)
function normalizeCourse(c: any): Course {
  return {
    ...c,
    teachers: c.teachers ?? [],
    students: c.students ?? [],
  };
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
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map(normalizeCourse);
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
  const data = await res.json();
  return normalizeCourse(data);
}

// create/update/delete: inchangés (l'API gère les permissions via teachers[])
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
  return normalizeCourse(await res.json());
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
  return normalizeCourse(await res.json());
}

export async function deleteCourse(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_URL}/courses/${id}`, { 
    method: "DELETE",
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to delete course: ${res.status}`);
  }
  return await res.json();
}
