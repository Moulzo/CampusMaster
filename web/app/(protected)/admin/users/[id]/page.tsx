"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { adminGetUser, adminUpdateUser, type AdminUser } from "@/lib/admin-users";

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AdminUser["role"]>("STUDENT");

  useEffect(() => {
    if (!id) return;

    (async () => {
      setError(null);
      setLoading(true);
      try {
        const u = await adminGetUser(id);
        setUser(u);
        setFullName(u.fullName ?? "");
        setRole(u.role);
      } catch (e: any) {
        setError(e?.message ?? "Impossible de charger l'utilisateur.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onSave() {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await adminUpdateUser(user.id, { fullName, role });
      setUser(updated);
      alert("Utilisateur mis a jour ✅");
    } catch (e: any) {
      alert(e?.message ?? "Mise a jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (!id) return <div className="p-6">Chargement…</div>;
  if (loading) return <div className="p-6">Chargement…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!user) return <div className="p-6">Introuvable.</div>;

  return (
    <div className="p-6 space-y-4 max-w-xl">
      <button className="underline" onClick={() => router.push("/admin/users")}>
        ← Retour
      </button>

      <h1 className="text-2xl font-bold">Modifier utilisateur</h1>

      <div className="space-y-2">
        <label className="block text-sm">Email (lecture seule)</label>
        <input className="w-full border rounded-md p-2" value={user.email} disabled />
      </div>

      <div className="space-y-2">
        <label className="block text-sm">Nom complet</label>
        <input
          className="w-full border rounded-md p-2"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm">Role</label>
        <select
          className="w-full border rounded-md p-2"
          value={role}
          onChange={(e) => setRole(e.target.value as AdminUser["role"])}
        >
          <option value="STUDENT">STUDENT</option>
          <option value="TEACHER">TEACHER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="px-4 py-2 rounded-md bg-zinc-900 text-white disabled:opacity-60"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}
