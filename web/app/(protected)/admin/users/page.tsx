"use client";

import { useEffect, useState } from "react";
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
  const [usersByTab, setUsersByTab] = useState<Partial<Record<UserTab, AdminUser[]>>>({});
  const [loadingByTab, setLoadingByTab] = useState<Partial<Record<UserTab, boolean>>>({});
  const [errorByTab, setErrorByTab] = useState<Partial<Record<UserTab, string | null>>>({});

  const users = usersByTab[activeTab] ?? [];
  const loading = loadingByTab[activeTab] ?? false;
  const error = errorByTab[activeTab] ?? null;

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
          : `${users.length} utilisateur${users.length > 1 ? "s" : ""} dans cet onglet`}
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
              onClick={() => setActiveTab(tab.value)}
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
          users={users}
          onDelete={onDelete}
          renderEditLink={(id) => <Link className="underline" href={`/admin/users/${id}`}>Modifier</Link>}
        />
      )}
    </div>
  );
}
