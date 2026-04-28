import type { Role } from "@/lib/auth-context";

export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  enabled?: boolean;
};

export function getNavItems(role: Role): NavItem[] {
  if (role === "ADMIN") {
    return [
      { label: "Tableau de bord", href: "/admin", icon: "📊", enabled: true },
      { label: "Utilisateurs", href: "/admin/users", icon: "👥", enabled: true },
      { label: "Étudiants", href: "/admin/students", icon: "🎓", enabled: true },
      { label: "Semestres", href: "/admin/semesters", icon: "📅", enabled: true },
      { label: "Modules", href: "/admin/modules", icon: "📚", enabled: true },
      { label: "Matières", href: "/admin/subjects", icon: "📖", enabled: true },
      { label: "Statistiques", href: "/admin/analytics", icon: "📈", enabled: true },
      { label: "Messages", href: "/messages", icon: "💬", enabled: true },
    ];
  }

  if (role === "TEACHER") {
    return [
      { label: "Tableau de bord", href: "/teacher", icon: "📊", enabled: true },
      { label: "Mes matières", href: "/teacher/subjects", icon: "📚", enabled: true },
      { label: "Devoirs", href: "/teacher/assignments", icon: "📝", enabled: true },
      { label: "Messages", href: "/messages", icon: "💬", enabled: true },
    ];
  }

  return [
    { label: "Tableau de bord", href: "/student", icon: "📊", enabled: true },
    { label: "Mes matières", href: "/student/subjects", icon: "📚", enabled: true },
    { label: "Devoirs", href: "/student/assignments", icon: "📝", enabled: true },
    { label: "Résultats", href: "/student/results", icon: "📊", enabled: true },
    { label: "Messages", href: "/messages", icon: "💬", enabled: true },
  ];
}
