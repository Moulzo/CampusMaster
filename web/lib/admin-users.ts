import { apiFetchJson } from "./auth";

export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;

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
