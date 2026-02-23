"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminDeleteUser, adminListUsers, type AdminUser } from "@/lib/admin-users";
import { UserTable } from "@/components/admin/UserTable";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const data = await adminListUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du chargement des utilisateurs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onDelete(id: string) {
    const ok = confirm("Supprimer cet utilisateur ?");
    if (!ok) return;

    try {
      await adminDeleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      alert(e?.message ?? "Suppression impossible.");
    }
  }

  const stats = useMemo(() => {
    const byRole = users.reduce(
      (acc, u) => {
        acc[u.role] = (acc[u.role] ?? 0) + 1;
        return acc;
      },
      {} as Record<AdminUser["role"], number>
    );
    return byRole;
  }, [users]);

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
            onClick={refresh}
            className="px-3 py-2 rounded-md bg-zinc-900 text-white hover:opacity-90"
          >
            Rafraichir
          </button>
        </div>
      </div>

      <div className="text-sm text-zinc-600">
        Total: {users.length} — ADMIN: {stats.ADMIN ?? 0} — TEACHER: {stats.TEACHER ?? 0} — STUDENT:{" "}
        {stats.STUDENT ?? 0}
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
