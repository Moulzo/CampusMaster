"use client";

import { useEffect, useState } from "react";
import {
  getSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  Semester,
} from "@/lib/admin-academics";
import { useToast } from "@/lib/toast";

function toInputDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // yyyy-mm-dd
  return d.toISOString().slice(0, 10);
}

export default function AdminSemestersPage() {
  const toast = useToast();
  const [items, setItems] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(""); // yyyy-mm-dd
  const [endDate, setEndDate] = useState("");

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const data = await getSemesters();
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate() {
    if (!name.trim()) return;
    try {
      const created = await createSemester({
        name: name.trim(),
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
      setItems((prev) => [created, ...prev]);
      setName("");
      setStartDate("");
      setEndDate("");
      toast.push("success", "Semestre créé");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur création");
    }
  }

  async function onEdit(id: string) {
    const s = items.find((x) => x.id === id);
    if (!s) return;

    const newName = prompt("Nom du semestre :", s.name);
    if (!newName || !newName.trim()) return;

    try {
      const updated = await updateSemester(id, { name: newName.trim() });
      setItems((prev) => prev.map((x) => (x.id === id ? updated : x)));
      toast.push("success", "Semestre modifié");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur modification");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer ce semestre ? (les modules liés seront supprimés)")) return;
    try {
      await deleteSemester(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.push("success", "Semestre supprimé");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur suppression");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Semestres</h1>
        <p className="text-slate-600">Créer et gérer les semestres (S1, S2, etc.).</p>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="font-semibold">Créer un semestre</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Nom (ex: S1 2025-2026)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <button onClick={onCreate} className="px-4 py-2 bg-blue-600 text-white rounded">
            Créer
          </button>
        </div>
      </div>

      {err && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">{err}</div>}

      {loading ? (
        <div>Chargement…</div>
      ) : items.length === 0 ? (
        <div className="text-slate-600">Aucun semestre.</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Nom</th>
                <th className="text-left p-3">Début</th>
                <th className="text-left p-3">Fin</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">{toInputDate(s.startDate) || "-"}</td>
                  <td className="p-3">{toInputDate(s.endDate) || "-"}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="px-3 py-1 rounded bg-slate-100"
                        onClick={() => onEdit(s.id)}
                      >
                        Modifier
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-red-100 text-red-700"
                        onClick={() => onDelete(s.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
