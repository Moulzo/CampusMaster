"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { logout } from "@/lib/auth";
import { getNavItems } from "@/lib/nav-items";
import { getRoleLabel } from "@/lib/role-labels";

function isActive(pathname: string, href: string, homeHref: string) {
  if (href === homeHref) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

const DESKTOP_EXPANDED_WIDTH = "18rem";
const DESKTOP_COLLAPSED_WIDTH = "5.5rem";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("cm:sidebar:collapsed");
    setDesktopCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("cm:sidebar:collapsed", String(desktopCollapsed));
  }, [desktopCollapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

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

  async function handleLogout() {
    try {
      await logout();
    } finally {
      window.location.href = "/login";
    }
  }

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!user) {
    return null;
  }

  const desktopSidebarWidth = desktopCollapsed
    ? DESKTOP_COLLAPSED_WIDTH
    : DESKTOP_EXPANDED_WIDTH;

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top bar mobile */}
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

          <div className="w-[44px]" />
        </div>
      </div>

      <div className="h-full">
        {/* Overlay mobile */}
        {mobileOpen && (
          <button
            aria-label="Fermer le menu"
            className="lg:hidden fixed inset-0 z-40 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar mobile */}
        <aside
          className={[
            "lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200",
            "transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="h-full flex flex-col">
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <Link href={homeHref} className="text-xl font-bold text-slate-900">
                  CampusMaster
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
                  aria-label="Fermer le menu"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 text-sm text-slate-600">
                <div className="font-semibold text-slate-800">{user.fullName}</div>
                <div className="uppercase text-xs tracking-wide">{getRoleLabel(user.role)}</div>
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

            <nav className="flex-1 overflow-y-auto p-3">
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
          </div>
        </aside>

        {/* Sidebar desktop fixe */}
        <aside
          className="hidden lg:flex fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-200 transition-[width] duration-200 ease-out"
          style={{ width: desktopSidebarWidth }}
        >
          <div className="h-full w-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between gap-2">
                {!desktopCollapsed && (
                  <Link href={homeHref} className="text-xl font-bold text-slate-900 truncate">
                    CampusMaster
                  </Link>
                )}

                <button
                  onClick={() => setDesktopCollapsed((prev) => !prev)}
                  className="shrink-0 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  aria-label={desktopCollapsed ? "Déplier la sidebar" : "Replier la sidebar"}
                  title={desktopCollapsed ? "Déplier" : "Replier"}
                >
                  {desktopCollapsed ? "☰" : "✕"}
                </button>
              </div>

              {!desktopCollapsed && (
                <>
                  <div className="mt-3 text-sm text-slate-600">
                    <div className="font-semibold text-slate-800">{user.fullName}</div>
                    <div className="uppercase text-xs tracking-wide">{getRoleLabel(user.role)}</div>
                    <div className="text-xs text-slate-500 truncate">{user.email}</div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      href={homeHref}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium text-center"
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
                </>
              )}
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const active = isActive(pathname, item.href, homeHref);
                  const enabled = item.enabled !== false;

                  const base =
                    "flex items-center rounded-lg text-sm font-medium transition";
                  const activeCls = active
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 hover:bg-slate-100";
                  const disabledCls = !enabled ? "opacity-50 pointer-events-none" : "";

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={[
                          base,
                          activeCls,
                          disabledCls,
                          desktopCollapsed
                            ? "justify-center px-3 py-3"
                            : "gap-3 px-3 py-2",
                        ].join(" ")}
                        title={desktopCollapsed ? item.label : undefined}
                      >
                        <span className="w-6 text-center shrink-0">{item.icon ?? "•"}</span>

                        {!desktopCollapsed && <span>{item.label}</span>}

                        {!desktopCollapsed && !enabled && (
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
          </div>
        </aside>

        {/* Contenu principal scrollable indépendamment */}
        <div
          className="hidden lg:block h-screen overflow-hidden"
          style={{ paddingLeft: desktopSidebarWidth }}
        >
          <main className="h-screen overflow-y-auto">
            <div className="min-h-full px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
        </div>

        {/* Contenu mobile */}
        <div className="lg:hidden h-[calc(100vh-57px)] overflow-y-auto">
          <main className="px-4 sm:px-6 py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
