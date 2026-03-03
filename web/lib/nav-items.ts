// apps/web/lib/nav-items.ts
import type { Role } from "@/lib/auth-context";

export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  enabled?: boolean; // si false => lien grisé (page pas encore créée)
};

export function getNavItems(role: Role): NavItem[] {
  if (role === "ADMIN") {
    return [
      { label: "Dashboard", href: "/admin", icon: "📊", enabled: true },
      { label: "Utilisateurs", href: "/admin/users", icon: "👥", enabled: true },
      { label: "Semestres", href: "/admin/semesters", icon: "📅", enabled: true },
      { label: "Modules", href: "/admin/modules", icon: "📚", enabled: true },
      { label: "Matières", href: "/admin/subjects", icon: "📖", enabled: true },
      { label: "Étudiants", href: "/admin/students", icon: "🎓", enabled: true },
      { label: "Test WS", href: "/test-notifications", icon: "🌐", enabled: true },
    ];
  }

  if (role === "TEACHER") {
    return [
      { label: "Dashboard", href: "/teacher", icon: "📊", enabled: true },
      { label: "Mes matières", href: "/teacher/subjects", icon: "📚", enabled: true },
      { label: "Devoirs", href: "/teacher/assignments", icon: "📝", enabled: true },
      { label: "Annonces", href: "/teacher/announcements", icon: "📢", enabled: false },
      { label: "Messages", href: "/teacher/messages", icon: "💬", enabled: false },
    ];
  }

  // STUDENT (par défaut)
  return [
    { label: "Dashboard", href: "/student", icon: "📊", enabled: true },
    { label: "Mes matières", href: "/student/subjects", icon: "📚", enabled: true },
    { label: "Devoirs", href: "/student/assignments", icon: "📝", enabled: true },
    { label: "Notes", href: "/student/grades", icon: "📈", enabled: false },
    { label: "Messages", href: "/student/messages", icon: "💬", enabled: false },
  ];
}
