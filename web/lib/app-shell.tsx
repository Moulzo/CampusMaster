// apps/web/lib/app-shell.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { logout } from "@/lib/auth";
import { getNavItems } from "@/lib/nav-items";

/**
 * Règle d'active:
 * - Pour les "home dashboards" (/student, /teacher, /admin) => actif UNIQUEMENT en match exact
 * - Pour les autres => actif si exact OU si sous-route (startsWith href + "/")
 */
function isActive(pathname: string, href: string, homeHref: string) {
  if (href === homeHref) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(() => {
    if (!user) return [];
    return getNavItems(user.role);
  }, [user]);

  const homeHref = useMemo(() => {
    if (!user) return "/login";
    if (user.role === "ADMIN") return "/admin";
    if (user.role === "TEACHER") return "/teacher";
    return "/student";
  }, [user]);

  // Ferme automatiquement la sidebar mobile quand on change de page
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      // replace + refresh => évite de rester sur une page protégée en cache
      router.replace("/login");
      router.refresh();
    }
  }

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  // (normalement ProtectedLayout redirige déjà, mais on sécurise)
  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top bar (mobile) - sans bouton logout (il est dans la sidebar) */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>

          <Link href={homeHref} className="font-bold text-slate-900">
            CampusMaster
          </Link>

          {/* espace à droite pour garder un layout propre */}
          <div className="w-[44px]" />
        </div>
      </div>

      <div className="flex">
        {/* Overlay (mobile) */}
        {mobileOpen && (
          <button
            aria-label="Fermer le menu"
            className="lg:hidden fixed inset-0 z-40 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={[
            "w-72 bg-white border-r border-slate-200 min-h-screen",
            "lg:sticky lg:top-0 lg:block",
            mobileOpen ? "fixed inset-y-0 left-0 z-50 block" : "hidden lg:block",
          ].join(" ")}
        >
          {/* Header sidebar */}
          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <Link href={homeHref} className="text-xl font-bold text-slate-900">
                CampusMaster
              </Link>

              {/* Close button mobile */}
              <button
                onClick={() => setMobileOpen(false)}
                className="lg:hidden px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
                aria-label="Fermer le menu"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 text-sm text-slate-600">
              <div className="font-semibold text-slate-800">{user.fullName}</div>
              <div className="uppercase text-xs tracking-wide">{user.role}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href={homeHref}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium text-center"
                onClick={() => setMobileOpen(false)}
              >
                Accueil
              </Link>
              <button
                onClick={handleLogout}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
              >
                Déconnexion
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav className="p-3">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href, homeHref);
                const enabled = item.enabled !== false;

                const base =
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition";
                const activeCls = active
                  ? "bg-blue-600 text-white"
                  : "text-slate-700 hover:bg-slate-100";
                const disabledCls = !enabled ? "opacity-50 pointer-events-none" : "";

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`${base} ${activeCls} ${disabledCls}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="w-6 text-center">{item.icon ?? "•"}</span>
                      <span>{item.label}</span>
                      {!enabled && (
                        <span className="ml-auto text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                          bientôt
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
