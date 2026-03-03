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
  const [createOpen, setCreateOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState(""); // yyyy-mm-dd
  const [editEndDate, setEditEndDate] = useState("");

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

  async function onCreate(): Promise<boolean> {
    if (!name.trim().length) {
      toast.push("error", "Le nom du semestre est requis.");
      return false;
    }
    
    if (startDate && endDate && startDate > endDate) {
      toast.push("error", "La date de début doit être avant la date de fin.");
      return false;
    }
    
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
      return true;
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur création");
      return false;
    }
  }

  function openEdit(id: string) {
    const s = items.find((x) => x.id === id);
    if (!s) return;

    setEditId(s.id);
    setEditName(s.name ?? "");
    setEditStartDate(toInputDate(s.startDate));
    setEditEndDate(toInputDate(s.endDate));
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditId(null);
    setEditName("");
    setEditStartDate("");
    setEditEndDate("");
  }

  async function onSaveEdit() {
    if (!editId) return;

    if (!editName.trim().length) {
      toast.push("error", "Le nom du semestre est requis.");
      return;
    }

    if (editStartDate && editEndDate && editStartDate > editEndDate) {
      toast.push("error", "La date de début doit être avant la date de fin.");
      return;
    }

    try {
      const updated = await updateSemester(editId, {
        name: editName.trim(),
        startDate: editStartDate ? new Date(editStartDate).toISOString() : undefined,
        endDate: editEndDate ? new Date(editEndDate).toISOString() : undefined,
      });

      setItems((prev) => prev.map((x) => (x.id === editId ? updated : x)));
      toast.push("success", "Semestre modifié");
      closeEdit();
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
        <div className="flex items-center justify-between">
          <div className="font-semibold">Création</div>

          {!createOpen ? (
            <button
              onClick={() => setCreateOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              + Créer un semestre
            </button>
          ) : (
            <button
              onClick={() => {
                setCreateOpen(false);
                setName("");
                setStartDate("");
                setEndDate("");
              }}
              className="px-4 py-2 rounded border hover:bg-slate-50"
            >
              Annuler
            </button>
          )}
        </div>

        {createOpen && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nom du semestre</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Ex : S1 2025-2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Date de début</label>
                <input
                  type="date"
                  className="border rounded px-3 py-2 w-full"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <p className="text-xs text-slate-500">Premier jour du semestre.</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Date de fin</label>
                <input
                  type="date"
                  className="border rounded px-3 py-2 w-full"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <p className="text-xs text-slate-500">Dernier jour du semestre.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCreateOpen(false);
                  setName("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="px-4 py-2 rounded border hover:bg-slate-50"
              >
                Annuler
              </button>

              <button
                onClick={async () => {
                  const ok = await onCreate();
                  if (ok) setCreateOpen(false);
                }}
                disabled={!name.trim().length}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </>
        )}
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
                        onClick={() => openEdit(s.id)}
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

      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeEdit}
        >
          <div
            className="w-full max-w-lg bg-white rounded-xl shadow-lg border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="text-lg font-semibold">Modifier un semestre</div>
              <div className="text-sm text-slate-600">
                Modifie le nom et/ou les dates du semestre.
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nom</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Date de début</label>
                  <input
                    type="date"
                    className="border rounded px-3 py-2 w-full"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Date de fin</label>
                  <input
                    type="date"
                    className="border rounded px-3 py-2 w-full"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                  />
                </div>
              </div>

              {editStartDate && editEndDate && editStartDate > editEndDate && (
                <div className="text-sm text-red-600">
                  La date de début doit être avant la date de fin.
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded border hover:bg-slate-50"
                onClick={closeEdit}
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                disabled={Boolean(
                  !editName.trim().length ||
                  (editStartDate && editEndDate && editStartDate > editEndDate)
                )}
                onClick={onSaveEdit}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
