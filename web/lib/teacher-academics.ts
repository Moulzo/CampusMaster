import { getAccessToken } from "@/lib/auth";

const API_URL = "http://localhost:3001/api";

function authHeaders() {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error("Access token manquant.");
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function getTeacherSubjects() {
  const res = await fetch(`${API_URL}/teacher/subjects`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to fetch teacher subjects");
  }
  return res.json();
}

export type TeacherCourseStudent = { id: string; fullName: string; email: string };

export async function getTeacherSubjectStudents(courseId: string) {
  const res = await fetch(`${API_URL}/teacher/subjects/${courseId}/students`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Erreur chargement étudiants");
  return (await res.json()) as TeacherCourseStudent[];
}
