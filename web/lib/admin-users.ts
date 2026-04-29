import { apiFetchJson } from "./auth";

export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;

  // ✅ nouveau (optionnel)
  learningModuleId?: string | null;
  learningModule?: {
    id: string;
    name: string;
    semester?: { id: string; name: string } | null;
  } | null;
};

export type UpdateAdminUserDto = Partial<Pick<AdminUser, "fullName" | "role" | "email" | "createdAt" | "updatedAt">>;

export type CreateAdminUserDto = {
  email: string;
  fullName: string;
  role: Role;
  password: string;
};

export type SetStudentModuleResult = AdminUser & {
  warning?: string | null;
};

export type AdminStudentAnalytics = {
  student: {
    id: string;
    fullName: string;
    email: string;
  };
  semesters: Array<{
    semesterId: string;
    semesterName: string;
    averageGrade: number | null;
    subjects: Array<{
      subjectId: string;
      subjectTitle: string;
      averageGrade: number | null;
      assignments: Array<{
        assignmentId: string;
        assignmentTitle: string;
        grade: number;
        submittedAt: string;
        dueDate: string;
      }>;
    }>;
  }>;
};

export function adminListUsers(role?: Role) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);

  const url = `/admin/users${params.toString() ? `?${params.toString()}` : ""}`;
  return apiFetchJson<AdminUser[]>(url);
}

export function adminGetUser(id: string) {
  return apiFetchJson<AdminUser>(`/admin/users/${id}`);
}

export function adminUpdateUser(id: string, data: UpdateAdminUserDto) {
  // Swagger: PATCH /api/admin/users/{id}
  return apiFetchJson<AdminUser>(`/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function adminDeleteUser(id: string) {
  // Swagger: DELETE /api/admin/users/{id}
  return apiFetchJson<void>(`/admin/users/${id}`, { method: "DELETE" });
}

export function adminGetStudentAnalytics(id: string) {
  return apiFetchJson<AdminStudentAnalytics>(`/admin/students/${id}/analytics`);
}

export function adminCreateUser(data: CreateAdminUserDto) {
  // Swagger: POST /api/admin/users
  return apiFetchJson<AdminUser>("/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function adminResetPassword(id: string) {
  return apiFetchJson<void>(`/admin/users/${id}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}
