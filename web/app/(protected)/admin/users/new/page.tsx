"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateUser, type CreateAdminUserDto, type Role } from "@/lib/admin-users";
import { roleOptions } from "@/lib/role-labels";

export default function AdminCreateUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateAdminUserDto>({
    email: "",
    fullName: "",
    role: "STUDENT",
    password: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev: CreateAdminUserDto) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await adminCreateUser(formData);
      alert("Utilisateur créé avec succès ✅");
      router.push("/admin/users");
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-xl">
      <button 
        className="underline" 
        onClick={() => router.push("/admin/users")}
      >
        ← Retour
      </button>

      <h1 className="text-2xl font-bold">Créer un utilisateur</h1>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full border rounded-md p-2"
            placeholder="email@exemple.com"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Nom complet</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            minLength={2}
            className="w-full border rounded-md p-2"
            placeholder="Jean Dupont"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Rôle</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full border rounded-md p-2"
          >
            {roleOptions.filter(opt => opt.value !== "ADMIN").map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Note: Les administrateurs ne peuvent pas créer d'autres administrateurs
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Mot de passe</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
            className="w-full border rounded-md p-2"
            placeholder="Minimum 8 caractères"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded-md bg-zinc-900 text-white disabled:opacity-60"
        >
          {loading ? "Création..." : "Créer l'utilisateur"}
        </button>
      </form>
    </div>
  );
}
