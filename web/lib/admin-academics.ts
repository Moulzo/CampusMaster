import { apiFetch } from './auth';

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

export type Course = {
  id: string;
  title: string;
  description?: string | null;
  teacherId: string;
  teacher?: { id: string; email: string; fullName: string };
  learningModuleId?: string | null;
  learningModule?: LearningModule | null;
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
export async function getSubjects() {
  const res = await apiFetch('/admin/subjects');
  if (!res.ok) throw new Error('Failed to fetch subjects');
  return res.json() as Promise<Course[]>;
}

export async function setSubjectModule(courseId: string, learningModuleId: string) {
  const res = await apiFetch(`/admin/subjects/${courseId}/module`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learningModuleId }),
  });
  if (!res.ok) throw new Error('Failed to set subject module');
  return res.json() as Promise<Course>;
}

export async function unsetSubjectModule(courseId: string) {
  const res = await apiFetch(`/admin/subjects/${courseId}/unset-module`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error('Failed to unset subject module');
  return res.json() as Promise<Course>;
}
