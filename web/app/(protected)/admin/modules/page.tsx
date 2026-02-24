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
  const [semesterId, setSemesterId] = useState<string>("");

  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const semesterOptions = useMemo(
    () => [{ id: "", name: "Tous les semestres" }, ...semesters],
    [semesters]
  );

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
      } catch {}
      await refreshModules();
    })();
  }, []);

  async function onCreate() {
    if (!name.trim()) return;
    if (!semesterId) {
      toast.push("error", "Choisis un semestre");
      return;
    }
    try {
      const created = await createLearningModule({
        name: name.trim(),
        description: description.trim() || undefined,
        semesterId,
      });
      setModules((prev) => [created, ...prev]);
      setName("");
      setDescription("");
      toast.push("success", "Module créé");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur création");
    }
  }

  async function onEdit(m: LearningModule) {
    const newName = prompt("Nom du module :", m.name);
    if (!newName || !newName.trim()) return;

    try {
      const updated = await updateLearningModule(m.id, { name: newName.trim() });
      setModules((prev) => prev.map((x) => (x.id === m.id ? updated : x)));
      toast.push("success", "Module modifié");
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Filtrer</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={semesterId}
              onChange={async (e) => {
                const v = e.target.value;
                setSemesterId(v);
                await refreshModules(v);
              }}
            >
              {semesterOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Nom</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="ex: Informatique"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Description</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="optionnel"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
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
                      <button className="px-3 py-1 rounded bg-slate-100" onClick={() => onEdit(m)}>
                        Modifier
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-red-100 text-red-700"
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
    </div>
  );
}
