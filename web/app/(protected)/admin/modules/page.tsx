"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSemesters,
  getLearningModules,
  createLearningModule,
  updateLearningModule,
  deleteLearningModule,
  Semester,
  LearningModule,
} from "@/lib/admin-academics";
import { useToast } from "@/lib/toast";

export default function AdminModulesPage() {
  const toast = useToast();

  const [semesters, setSemesters] = useState<Semester[]>([]);

  // ✅ Séparation: filtre vs création
  const [filterSemesterId, setFilterSemesterId] = useState<string>("");
  const [createSemesterId, setCreateSemesterId] = useState<string>("");

  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Modal édition
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSemesterId, setEditSemesterId] = useState<string>("");

  const semesterFilterOptions = useMemo(
    () => [{ id: "", name: "Tous les semestres" }, ...semesters],
    [semesters]
  );

  const semesterCreateOptions = useMemo(() => semesters, [semesters]);

  async function refreshModules(selectedSemesterId?: string) {
    setLoading(true);
    setErr("");
    try {
      const data = await getLearningModules(selectedSemesterId || undefined);
      setModules(data);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const s = await getSemesters();
        setSemesters(s);

        // ✅ UX: pré-sélectionner un semestre pour la création si on a des semestres
        if (s.length > 0) setCreateSemesterId(s[0].id);
      } catch {
        // ignore
      }
      await refreshModules();
    })();
  }, []);

  async function onCreate(): Promise<boolean> {
    if (!name.trim().length) {
      toast.push("error", "Le nom du module est requis.");
      return false;
    }
    if (!createSemesterId) {
      toast.push("error", "Choisis un semestre pour créer le module.");
      return false;
    }

    try {
      const created = await createLearningModule({
        name: name.trim(),
        description: description.trim() || undefined,
        semesterId: createSemesterId,
      });

      // Si on est filtré sur un semestre différent, le nouveau module peut ne pas être visible.
      // On gère proprement:
      if (!filterSemesterId || filterSemesterId === createSemesterId) {
        setModules((prev) => [created, ...prev]);
      } else {
        // si filtre actif et différent -> on ne l'injecte pas (sinon incohérent)
        // mais on peut notifier
        toast.push("success", "Module créé (non visible avec le filtre actuel)");
      }

      setName("");
      setDescription("");
      toast.push("success", "Module créé");
      return true;
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur création");
      return false;
    }
  }

  function openEdit(m: LearningModule) {
    setEditId(m.id);
    setEditName(m.name ?? "");
    setEditDescription(m.description ?? "");
    setEditSemesterId(m.semesterId ?? "");
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditId(null);
    setEditName("");
    setEditDescription("");
    setEditSemesterId("");
  }

  async function onSaveEdit() {
    if (!editId) return;

    if (!editName.trim().length) {
      toast.push("error", "Le nom du module est requis.");
      return;
    }
    if (!editSemesterId) {
      toast.push("error", "Choisis un semestre.");
      return;
    }

    try {
      const updated = await updateLearningModule(editId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        semesterId: editSemesterId,
      });

      // Si le module change de semestre, il peut ne plus correspondre au filtre
      setModules((prev) => {
        const next = prev.map((x) => (x.id === editId ? updated : x));
        if (filterSemesterId && updated.semesterId !== filterSemesterId) {
          return next.filter((x) => x.id !== editId);
        }
        return next;
      });

      toast.push("success", "Module modifié");
      closeEdit();
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur modification");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer ce module ?")) return;
    try {
      await deleteLearningModule(id);
      setModules((prev) => prev.filter((x) => x.id !== id));
      toast.push("success", "Module supprimé");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur suppression");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modules</h1>
        <p className="text-slate-600">Créer et gérer les modules par semestre.</p>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Création</div>

        {!createOpen ? (
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            + Créer un module
          </button>
        ) : (
          <button
            onClick={() => {
              setCreateOpen(false);
              setName("");
              setDescription("");
              // (on garde createSemesterId tel quel, pratique)
            }}
            className="px-4 py-2 rounded border hover:bg-slate-50"
          >
            Annuler
          </button>
        )}
      </div>

      {createOpen && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">
                Semestre (création)
              </label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={createSemesterId}
                onChange={(e) => setCreateSemesterId(e.target.value)}
              >
                <option value="" disabled>
                  Choisir un semestre…
                </option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Le module sera rattaché à ce semestre.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Nom du module</label>
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="Ex : Informatique"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-slate-500">Nom affiché côté étudiant / admin.</p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Description (optionnel)
              </label>
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="Optionnel"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={async () => {
                const ok = await onCreate();
                if (ok) setCreateOpen(false);
              }}
              disabled={!name.trim().length || !createSemesterId}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Créer
            </button>
          </div>
        </>
      )}
    </div>

      <div className="bg-white border rounded-lg p-4 space-y-2">
        <div className="font-semibold">Filtrer la liste</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Semestre</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={filterSemesterId}
              onChange={async (e) => {
                const v = e.target.value;
                setFilterSemesterId(v);
                await refreshModules(v);
              }}
            >
              {semesterFilterOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              Affiche les modules d'un semestre (ou tous).
            </p>
          </div>

          <div className="flex md:justify-end">
            <button
              className="px-4 py-2 rounded border hover:bg-slate-50"
              onClick={async () => {
                setFilterSemesterId("");
                await refreshModules();
              }}
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {err && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">{err}</div>}

      {loading ? (
        <div>Chargement…</div>
      ) : modules.length === 0 ? (
        <div className="text-slate-600">Aucun module.</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Nom</th>
                <th className="text-left p-3">Semestre</th>
                <th className="text-left p-3">Description</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3 font-medium">{m.name}</td>
                  <td className="p-3">{m.semester?.name ?? m.semesterId}</td>
                  <td className="p-3">{m.description ?? "-"}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200"
                        onClick={() => openEdit(m)}
                      >
                        Modifier
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                        onClick={() => onDelete(m.id)}
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

      {/* Modal Modifier */}
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
              <div className="text-lg font-semibold">Modifier un module</div>
              <div className="text-sm text-slate-600">
                Mets à jour le nom, la description et le semestre.
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

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Description (optionnel)</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Optionnel"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Semestre</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={editSemesterId}
                  onChange={(e) => setEditSemesterId(e.target.value)}
                >
                  <option value="" disabled>
                    Choisir un semestre…
                  </option>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
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
                onClick={onSaveEdit}
                disabled={!editName.trim().length || !editSemesterId}
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
