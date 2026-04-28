"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminDeleteUser, adminListUsers, type AdminUser } from "@/lib/admin-users";
import { UserTable } from "@/components/admin/UserTable";
import { roleOptions, getRoleLabel } from "@/lib/role-labels";

export default function AdminUsersPage() {
  type UserTab = "ALL" | AdminUser["role"];

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

  const users = usersByTab[activeTab] ?? [];
  const loading = loadingByTab[activeTab] ?? false;
  const error = errorByTab[activeTab] ?? null;

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.fullName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    });
  }, [users, searchQuery]);

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
          : searchQuery.trim()
            ? `${filteredUsers.length} résultat${filteredUsers.length > 1 ? "s" : ""} sur ${users.length} utilisateur${users.length > 1 ? "s" : ""}`
            : `${users.length} utilisateur${users.length > 1 ? "s" : ""} dans cet onglet`}
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
