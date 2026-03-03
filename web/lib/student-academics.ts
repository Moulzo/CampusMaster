import { apiFetch } from "@/lib/auth";

export interface UserLite {
  id: string;
  email: string;
  fullName?: string;
}

export interface SemesterLite {
  id: string;
  name: string;
}

export interface LearningModuleLite {
  id: string;
  name: string;
  semester?: SemesterLite;
}

export interface StudentSubject {
  id: string;
  title: string;
  description?: string;
  learningModuleId: string | null;
  teachers: UserLite[];
  learningModule?: LearningModuleLite | null;
}

export async function getMySubjects() {
  const res = await apiFetch("/student/subjects");
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to fetch student subjects");
  }
  return res.json() as Promise<StudentSubject[]>;
}
