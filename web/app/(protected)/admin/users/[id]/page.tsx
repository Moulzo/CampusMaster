"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { adminGetUser, adminUpdateUser, type AdminUser } from "@/lib/admin-users";
import {
  getLearningModules,
  setStudentModule,
  unsetStudentModule,
  type LearningModule,
} from "@/lib/admin-academics";
import { roleOptions, getRoleLabel } from "@/lib/role-labels";

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
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [learningModuleId, setLearningModuleId] = useState<string>(""); // "" => aucun module

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
        setLearningModuleId(u.learningModuleId ?? "");

        const mods = await getLearningModules();
        setModules(mods);
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
      // 1) envoyer toujours fullName et role (Backend demande au moins 1 champ)
      const updated = await adminUpdateUser(user.id, { fullName, role });
      setUser(updated);

      // 2) gérer l'affectation module UNIQUEMENT pour STUDENT
      if (role === "STUDENT") {
        if (learningModuleId && learningModuleId !== user.learningModuleId) {
          await setStudentModule(user.id, learningModuleId);
        } else if (!learningModuleId && user.learningModuleId) {
          await unsetStudentModule(user.id);
        }
      } else if (user.learningModuleId) {
        // si on passe à TEACHER/ADMIN, nettoyer seulement si l'utilisateur avait un module
        await unsetStudentModule(user.id);
      }

      // 3) rafraîchir user pour avoir l'état DB exact (learningModuleId/learningModule)
      const fresh = await adminGetUser(user.id);
      setUser(fresh);
      setLearningModuleId(fresh.learningModuleId ?? "");

      alert("Utilisateur mis à jour ✅");
    } catch (e: any) {
      console.error("Save error:", e);
      alert(e?.message ?? "Mise à jour impossible.");
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
        <label className="block text-sm">Rôle</label>
        <select
          className="w-full border rounded-md p-2"
          value={role}
          onChange={(e) => setRole(e.target.value as AdminUser["role"])}
        >
          {roleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {role === "STUDENT" && (
        <div className="space-y-2">
          <label className="block text-sm">Module</label>
          <select
            className="w-full border rounded-md p-2"
            value={learningModuleId}
            onChange={(e) => setLearningModuleId(e.target.value)}
          >
            <option value="">Aucun module</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.semester ? `${m.semester.name} / ` : ""}{m.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">
            Affecte l'étudiant à un module (ou "Aucun module" pour désaffecter).
          </p>
        </div>
      )}

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
