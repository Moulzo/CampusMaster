"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminDeleteUser, adminListUsers, type AdminUser } from "@/lib/admin-users";
import { UserTable } from "@/components/admin/UserTable";
import { roleOptions, getRoleLabel } from "@/lib/role-labels";
import {
  getLearningModules,
  type LearningModule,
} from "@/lib/admin-academics";

export default function AdminUsersPage() {
  type UserTab = "ALL" | AdminUser["role"];

  type ActivityFilter = "ALL" | "ACTIVE_7_DAYS" | "ACTIVE_30_DAYS" | "INACTIVE" | "NEVER_CONNECTED";

  const activityOptions: Array<{ value: ActivityFilter; label: string }> = [
    { value: "ALL", label: "Toutes les activités" },
    { value: "ACTIVE_7_DAYS", label: "Actifs 7 jours" },
    { value: "ACTIVE_30_DAYS", label: "Actifs 30 jours" },
    { value: "INACTIVE", label: "Inactifs +30 jours" },
    { value: "NEVER_CONNECTED", label: "Jamais connectés" },
  ];

  const userTabs: Array<{ value: UserTab; label: string }> = [
    { value: "ALL", label: "Tous" },
    ...roleOptions.map((option) => ({
      value: option.value as AdminUser["role"],
      label: option.label,
    })),
  ];

  const [activeTab, setActiveTab] = useState<UserTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [usersByTab, setUsersByTab] = useState<Partial<Record<UserTab, AdminUser[]>>>({});
  const [loadingByTab, setLoadingByTab] = useState<Partial<Record<UserTab, boolean>>>({});
  const [errorByTab, setErrorByTab] = useState<Partial<Record<UserTab, string | null>>>({});
  const [learningModules, setLearningModules] = useState<LearningModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<"ALL" | "UNASSIGNED" | string>(
    "ALL",
  );
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("ALL");

  const users = usersByTab[activeTab] ?? [];
  const loading = loadingByTab[activeTab] ?? false;
  const error = errorByTab[activeTab] ?? null;

  function matchesActivityFilter(
    lastLoginAt: string | null | undefined,
    filter: ActivityFilter,
  ) {
    if (filter === "ALL") {
      return true;
    }

    if (!lastLoginAt) {
      return filter === "NEVER_CONNECTED";
    }

    const lastLoginTime = new Date(lastLoginAt).getTime();

    if (Number.isNaN(lastLoginTime)) {
      return filter === "NEVER_CONNECTED";
    }

    const daysSinceLogin =
      (Date.now() - lastLoginTime) / (1000 * 60 * 60 * 24);

    if (filter === "ACTIVE_7_DAYS") {
      return daysSinceLogin <= 7;
    }

    if (filter === "ACTIVE_30_DAYS") {
      return daysSinceLogin <= 30;
    }

    if (filter === "INACTIVE") {
      return daysSinceLogin > 30;
    }

    return true;
  }

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.fullName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query);

      const matchesModule =
        activeTab !== "STUDENT" ||
        moduleFilter === "ALL" ||
        (moduleFilter === "UNASSIGNED" && !user.learningModuleId) ||
        user.learningModuleId === moduleFilter;

      const matchesActivity = matchesActivityFilter(
        user.lastLoginAt,
        activityFilter,
      );

      return matchesSearch && matchesModule && matchesActivity;
    });
  }, [users, searchQuery, activeTab, moduleFilter, activityFilter]);

  async function loadTab(tab: UserTab, options?: { force?: boolean }) {
    if (!options?.force && usersByTab[tab]) {
      return;
    }

    setErrorByTab((prev) => ({ ...prev, [tab]: null }));
    setLoadingByTab((prev) => ({ ...prev, [tab]: true }));

    try {
      const role = tab === "ALL" ? undefined : tab;
      const data = await adminListUsers(role);

      setUsersByTab((prev) => ({ ...prev, [tab]: data }));
    } catch (e: any) {
      setErrorByTab((prev) => ({
        ...prev,
        [tab]: e?.message ?? "Erreur lors du chargement des utilisateurs.",
      }));
    } finally {
      setLoadingByTab((prev) => ({ ...prev, [tab]: false }));
    }
  }

  function refresh() {
    void loadTab(activeTab, { force: true });
  }

  useEffect(() => {
    void loadTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "STUDENT") {
      return;
    }

    if (learningModules.length > 0 || loadingModules) {
      return;
    }

    setLoadingModules(true);

    getLearningModules()
      .then(setLearningModules)
      .catch((error) => {
        console.error("Erreur chargement modules:", error);
      })
      .finally(() => {
        setLoadingModules(false);
      });
  }, [activeTab, learningModules.length, loadingModules]);

  useEffect(() => {
    if (activeTab !== "STUDENT") {
      setModuleFilter("ALL");
    }
  }, [activeTab]);

  async function onDelete(id: string) {
    const ok = confirm("Supprimer cet utilisateur ?");
    if (!ok) return;

    try {
      await adminDeleteUser(id);
      setUsersByTab((prev) => {
        const next = { ...prev };

        for (const tab of Object.keys(next) as UserTab[]) {
          next[tab] = next[tab]?.filter((user) => user.id !== id);
        }

        return next;
      });
    } catch (e: any) {
      alert(e?.message ?? "Suppression impossible.");
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/users/new"
            className="px-3 py-2 rounded-md bg-green-600 text-white hover:opacity-90"
          >
            + Créer utilisateur
          </Link>
          <button
            onClick={() => refresh()}
            className="px-3 py-2 rounded-md bg-zinc-900 text-white hover:opacity-90"
          >
            Rafraichir
          </button>
        </div>
      </div>

      <div className="text-sm text-zinc-600">
        {loading
          ? "Chargement des utilisateurs..."
          : searchQuery.trim() || moduleFilter !== "ALL" || activityFilter !== "ALL"
            ? `${filteredUsers.length} résultat${
                filteredUsers.length > 1 ? "s" : ""
              } sur ${users.length} utilisateur${users.length > 1 ? "s" : ""}`
            : `${users.length} utilisateur${
                users.length > 1 ? "s" : ""
              } dans cet onglet`}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <label htmlFor="admin-users-search" className="text-sm font-medium text-zinc-700">
            Rechercher dans l'onglet actif
          </label>
          <p className="text-xs text-zinc-500">
            Recherche par nom ou adresse email.
          </p>
        </div>

        <div className="flex w-full gap-2 sm:max-w-md">
          <input
            id="admin-users-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nom ou email..."
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <label
            htmlFor="admin-users-activity-filter"
            className="text-sm font-medium text-zinc-700"
          >
            Filtrer par activité
          </label>
          <p className="text-xs text-zinc-500">
            Utilise la dernière connexion enregistrée pour repérer les comptes actifs ou inactifs.
          </p>
        </div>

        <select
          id="admin-users-activity-filter"
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-md"
        >
          {activityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {activeTab === "STUDENT" && (
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <label
              htmlFor="admin-users-module-filter"
              className="text-sm font-medium text-zinc-700"
            >
              Filtrer les étudiants par module
            </label>
            <p className="text-xs text-zinc-500">
              Affiche uniquement les étudiants rattachés au module choisi.
            </p>
          </div>

          <select
            id="admin-users-module-filter"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            disabled={loadingModules}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-md"
          >
            <option value="ALL">
              {loadingModules ? "Chargement des modules..." : "Tous les modules"}
            </option>
            <option value="UNASSIGNED">Étudiants non affectés</option>

            {learningModules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.semester?.name ? `${module.semester.name} — ` : ""}
                {module.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-zinc-200">
        {userTabs.map((tab) => {
          const active = activeTab === tab.value;
          const isLoaded = Boolean(usersByTab[tab.value]);
          const isLoading = Boolean(loadingByTab[tab.value]);

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setActiveTab(tab.value);
                setSearchQuery("");
                setActivityFilter("ALL");
              }}
              className={[
                "rounded-t-lg px-4 py-2 text-sm font-medium transition",
                active
                  ? "border border-b-white border-zinc-200 bg-white text-blue-700"
                  : "text-zinc-600 hover:bg-zinc-50",
              ].join(" ")}
            >
              {tab.label}

              {isLoading ? (
                <span className="ml-2 text-xs text-zinc-400">...</span>
              ) : isLoaded ? (
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                  {usersByTab[tab.value]?.length ?? 0}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {loading && <p>Chargement…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <UserTable
          users={filteredUsers}
          onDelete={onDelete}
          renderEditLink={(id) => (
            <Link className="underline" href={`/admin/users/${id}`}>
              Modifier
            </Link>
          )}
        />
      )}
    </div>
  );
}
