// apps/web/lib/role-labels.ts
export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrateur",
  TEACHER: "Enseignant",
  STUDENT: "Étudiant",
};

export function getRoleLabel(role: Role | string): string {
  return roleLabels[role as Role] || role;
}

export const roleOptions: Array<{ value: Role; label: string }> = [
  { value: "STUDENT", label: roleLabels.STUDENT },
  { value: "TEACHER", label: roleLabels.TEACHER },
  { value: "ADMIN", label: roleLabels.ADMIN },
];
