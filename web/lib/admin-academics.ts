import { apiFetch } from './auth';

// Helper pour une meilleure gestion des erreurs
async function throwApiError(res: Response, fallback: string) {
  const txt = await res.text().catch(() => "");
  throw new Error(txt || fallback);
}

// Types simplifiés pour l'admin
export type Semester = {
  id: string;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
};

export type LearningModule = {
  id: string;
  name: string;
  description?: string | null;
  semesterId: string;
  semester?: { id: string; name: string };
};

// Ajoute un type simple si tu ne l'as pas déjà
export type SimpleTeacher = {
  id: string;
  email: string;
  fullName?: string | null;
};

export type Course = {
  id: string;
  title: string;
  description?: string | null;
  learningModuleId?: string | null;
  learningModule?: LearningModule | null;

  // ancien champ possible (nullable)
  teacherUserId?: string | null;
  teacher?: { id: string; email: string; fullName: string } | null;

  // ✅ nouveau / attendu
  teachers?: SimpleTeacher[];

  // optionnel
  students?: any[];
};

export interface CreateSemesterDto {
  name: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateLearningModuleDto {
  name: string;
  description?: string;
  semesterId: string;
}

// Semesters API
export async function getSemesters() {
  const res = await apiFetch('/admin/semesters');
  if (!res.ok) throw new Error('Failed to fetch semesters');
  return res.json() as Promise<Semester[]>;
}

export async function createSemester(data: CreateSemesterDto) {
  const res = await apiFetch('/admin/semesters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create semester');
  return res.json() as Promise<Semester>;
}

export async function updateSemester(id: string, data: Partial<CreateSemesterDto>) {
  const res = await apiFetch(`/admin/semesters/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update semester');
  return res.json() as Promise<Semester>;
}

export async function deleteSemester(id: string) {
  const res = await apiFetch(`/admin/semesters/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete semester');
}

// Learning Modules API
export async function getLearningModules(semesterId?: string) {
  const url = semesterId 
    ? `/admin/learning-modules?semesterId=${semesterId}`
    : '/admin/learning-modules';
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch learning modules');
  return res.json() as Promise<LearningModule[]>;
}

export async function createLearningModule(data: CreateLearningModuleDto) {
  const res = await apiFetch('/admin/learning-modules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create learning module');
  return res.json() as Promise<LearningModule>;
}

export async function updateLearningModule(id: string, data: Partial<CreateLearningModuleDto>) {
  const res = await apiFetch(`/admin/learning-modules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update learning module');
  return res.json() as Promise<LearningModule>;
}

export async function deleteLearningModule(id: string) {
  const res = await apiFetch(`/admin/learning-modules/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete learning module');
}

// Subjects (Courses) API
export type Subject = {
  id: string;
  title: string;
  description: string | null;
  learningModuleId: string | null;
  learningModule?: {
    id: string;
    name: string;
    semester?: { id: string; name: string };
  } | null;
  teachers: Array<{ id: string; email: string; fullName: string | null }>;
  createdAt: string;
  updatedAt: string;
};

export async function getSubjects(filters?: { moduleId?: string; teacherId?: string }) {
  const params = new URLSearchParams();
  if (filters?.moduleId) params.append("moduleId", filters.moduleId);
  if (filters?.teacherId) params.append("teacherId", filters.teacherId);

  const url = `/admin/subjects${params.toString() ? `?${params}` : ""}`;
  const res = await apiFetch(url);
  if (!res.ok) await throwApiError(res, "Failed to fetch subjects");
  return res.json() as Promise<Subject[]>;
}

export async function createSubject(input: {
  title: string;
  description?: string | null;
  learningModuleId?: string | null;
}) {
  const res = await apiFetch(`/admin/subjects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      description: input.description ?? null,
      // ✅ on envoie null si vide, jamais une string vide
      learningModuleId: input.learningModuleId ? input.learningModuleId : null,
    }),
  });

  if (!res.ok) await throwApiError(res, "Failed to create subject");
  return res.json() as Promise<Subject>;
}

export async function updateSubject(id: string, input: {
  title?: string;
  description?: string | null;
  learningModuleId?: string | null;
}) {
  const body: any = {};
  if (input.title !== undefined) body.title = input.title;
  if (input.description !== undefined) body.description = input.description;
  if (input.learningModuleId !== undefined)
    body.learningModuleId = input.learningModuleId || null;

  const res = await apiFetch(`/admin/subjects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) await throwApiError(res, "Failed to update subject");
  return res.json() as Promise<Subject>;
}

export async function deleteSubject(id: string) {
  const res = await apiFetch(`/admin/subjects/${id}`, { method: "DELETE" });
  if (!res.ok) await throwApiError(res, "Failed to delete subject");
  return res.json();
}

// ✅ Wrappers simples autour de updateSubject (logique centralisée)
export async function setSubjectModule(subjectId: string, learningModuleId: string) {
  return updateSubject(subjectId, { learningModuleId });
}

export async function unsetSubjectModule(subjectId: string) {
  return updateSubject(subjectId, { learningModuleId: null });
}

// ✅ SET profs (remplace toute la liste)
export async function setSubjectTeachers(subjectId: string, teacherIds: string[]) {
  const res = await apiFetch(`/admin/subjects/${subjectId}/teachers`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherIds }),
  });
  if (!res.ok) await throwApiError(res, 'Failed to set subject teachers');
  return res.json() as Promise<Subject>;
}

// ✅ retirer 1 prof
export async function removeSubjectTeacher(subjectId: string, userId: string) {
  const res = await apiFetch(`/admin/subjects/${subjectId}/teachers/${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) await throwApiError(res, 'Failed to remove subject teacher');
  return res.json() as Promise<Subject>;
}

// ✅ récupérer tous les professeurs
export async function getTeachers() {
  const res = await apiFetch('/admin/users?role=TEACHER');
  if (!res.ok) await throwApiError(res, 'Failed to fetch teachers');
  return res.json() as Promise<Array<{ id: string; email: string; fullName?: string | null; role: string }>>;
}

// Types pour les étudiants
export type Student = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  learningModuleId?: string | null;
  learningModule?: {
    id: string;
    name: string;
    semester?: {
      id: string;
      name: string;
    };
  } | null;
  createdAt: string;
  updatedAt: string;
};

// ✅ récupérer tous les étudiants
export async function getStudents(filters?: { moduleId?: string; q?: string }) {
  const params = new URLSearchParams();
  if (filters?.moduleId) params.append('moduleId', filters.moduleId);
  if (filters?.q) params.append('q', filters.q);
  
  const url = `/admin/students${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch students');
  return res.json() as Promise<Student[]>;
}

// ✅ affecter un étudiant à un module
export async function setStudentModule(studentId: string, learningModuleId: string) {
  const res = await apiFetch(`/admin/students/${studentId}/module`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learningModuleId }),
  });
  if (!res.ok) throw new Error('Failed to set student module');
  return res.json() as Promise<Student>;
}

// ✅ désaffecter un étudiant d'un module
export async function unsetStudentModule(studentId: string) {
  const res = await apiFetch(`/admin/students/${studentId}/unset-module`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error('Failed to unset student module');
  return res.json() as Promise<Student>;
}
