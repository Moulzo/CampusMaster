"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  Semester,
} from "@/lib/admin-academics";
import {
  getAdminAnalyticsGradesEvolution,
  type SemesterGradesEvolution,
} from "@/lib/admin-analytics";
import { useToast } from "@/lib/toast";

function toInputDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatAvg(v: number | null) {
  return v === null ? "—" : `${v.toFixed(2)} / 20`;
}

function formatPercent(v: number | null) {
  return v === null ? "—" : `${v.toFixed(1)}%`;
}

function statToneClasses(tone: "blue" | "green" | "amber" | "red" | "purple") {
  return {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  }[tone];
}

function SemesterStatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function SemesterChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "amber" | "red" | "purple";
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${statToneClasses(
        tone,
      )}`}
    >
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

export default function AdminSemestersPage() {
  const toast = useToast();

  const [items, setItems] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  const [semesterAnalytics, setSemesterAnalytics] = useState<SemesterGradesEvolution[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  const [statsOpen, setStatsOpen] = useState(false);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);

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

  async function loadAnalyticsIfNeeded() {
    if (analyticsLoaded || analyticsLoading) return;

    setAnalyticsLoading(true);
    try {
      const data = await getAdminAnalyticsGradesEvolution();
      setSemesterAnalytics(data);
      setAnalyticsLoaded(true);
    } catch (e) {
      console.error("Erreur chargement analytics semestres", e);
      toast.push("error", "Impossible de charger les statistiques du semestre.");
    } finally {
      setAnalyticsLoading(false);
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

  async function openStats(id: string) {
    setSelectedSemesterId(id);
    setStatsOpen(true);
    await loadAnalyticsIfNeeded();
  }

  function closeStats() {
    setStatsOpen(false);
    setSelectedSemesterId(null);
  }

  const selectedSemester = useMemo(
    () => items.find((s) => s.id === selectedSemesterId) ?? null,
    [items, selectedSemesterId],
  );

  const selectedSemesterAnalytics = useMemo(
    () => semesterAnalytics.find((s) => s.semesterId === selectedSemesterId) ?? null,
    [semesterAnalytics, selectedSemesterId],
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Semestres</h1>
        <p className="text-slate-600">Créer et gérer les semestres (S1, S2, etc.).</p>
      </div>

      <div className="space-y-3 rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Création</div>

          {!createOpen ? (
            <button
              onClick={() => setCreateOpen(true)}
              className="rounded bg-blue-600 px-4 py-2 text-white"
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
              className="rounded border px-4 py-2 hover:bg-slate-50"
            >
              Annuler
            </button>
          )}
        </div>

        {createOpen && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nom du semestre</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  placeholder="Ex : S1 2025-2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Date de début</label>
                <input
                  type="date"
                  className="w-full rounded border px-3 py-2"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <p className="text-xs text-slate-500">Premier jour du semestre.</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Date de fin</label>
                <input
                  type="date"
                  className="w-full rounded border px-3 py-2"
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
                className="rounded border px-4 py-2 hover:bg-slate-50"
              >
                Annuler
              </button>

              <button
                onClick={async () => {
                  const ok = await onCreate();
                  if (ok) setCreateOpen(false);
                }}
                disabled={!name.trim().length}
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </>
        )}
      </div>

      {err && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div>Chargement…</div>
      ) : items.length === 0 ? (
        <div className="text-slate-600">Aucun semestre.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">Nom</th>
                <th className="p-3 text-left">Début</th>
                <th className="p-3 text-left">Fin</th>
                <th className="p-3 text-right">Actions</th>
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
                        className="rounded bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-100"
                        onClick={() => openStats(s.id)}
                      >
                        Stats
                      </button>
                      <button
                        className="rounded bg-slate-100 px-3 py-1 hover:bg-slate-200"
                        onClick={() => openEdit(s.id)}
                      >
                        Modifier
                      </button>
                      <button
                        className="rounded bg-red-100 px-3 py-1 text-red-700 hover:bg-red-200"
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
            className="w-full max-w-lg rounded-xl border bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b p-4">
              <div className="text-lg font-semibold">Modifier un semestre</div>
              <div className="text-sm text-slate-600">
                Modifie le nom et/ou les dates du semestre.
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nom</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Date de début</label>
                  <input
                    type="date"
                    className="w-full rounded border px-3 py-2"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Date de fin</label>
                  <input
                    type="date"
                    className="w-full rounded border px-3 py-2"
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

            <div className="flex justify-end gap-2 border-t p-4">
              <button
                className="rounded border px-4 py-2 hover:bg-slate-50"
                onClick={closeEdit}
              >
                Annuler
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                disabled={Boolean(
                  !editName.trim().length ||
                    (editStartDate && editEndDate && editStartDate > editEndDate),
                )}
                onClick={onSaveEdit}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {statsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeStats}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b p-4">
              <div className="text-lg font-semibold">
                Statistiques du semestre
                {selectedSemester?.name ? ` — ${selectedSemester.name}` : ""}
              </div>
              <div className="text-sm text-slate-600">
                Vue synthétique du semestre sélectionné.
              </div>
            </div>

            <div className="space-y-6 p-4">
              {analyticsLoading ? (
                <div className="text-sm text-slate-500">Chargement des statistiques…</div>
              ) : !selectedSemesterAnalytics ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Aucune donnée analytique disponible pour ce semestre.
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedSemesterAnalytics.semesterName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Analyse pédagogique du semestre sélectionné.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <SemesterStatCard
                      label="Moyenne du semestre"
                      value={formatAvg(selectedSemesterAnalytics.averageGrade)}
                      sub="Normalisée sur 20"
                    />
                    <SemesterStatCard
                      label="Taux de rendu du semestre"
                      value={formatPercent(selectedSemesterAnalytics.submissionRate)}
                      sub={`${selectedSemesterAnalytics.totalDelivered} rendus / ${selectedSemesterAnalytics.totalExpected} attendus`}
                    />
                    <SemesterStatCard
                      label="Copies notées"
                      value={String(selectedSemesterAnalytics.totalGraded)}
                      sub="Rendus corrigés avec note"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <SemesterChip
                      label="Rendus non corrigés"
                      value={String(selectedSemesterAnalytics.totalUncorrected)}
                      tone="amber"
                    />
                    <SemesterChip
                      label="Rendus en retard"
                      value={String(selectedSemesterAnalytics.totalLate)}
                      tone="red"
                    />
                    <SemesterChip
                      label="Rendus"
                      value={String(selectedSemesterAnalytics.totalDelivered)}
                      tone="blue"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Modules du semestre
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Comparaison des modules selon la moyenne, les copies notées,
                        les retards et les rendus non corrigés.
                      </p>
                    </div>

                    {selectedSemesterAnalytics.moduleBreakdown.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        Aucun module analytique disponible pour ce semestre.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {selectedSemesterAnalytics.moduleBreakdown.map((module) => (
                          <div
                            key={module.moduleId}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {module.moduleName}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {module.gradedCount} copies notées
                                </div>
                              </div>

                              <div
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                  module.averageGrade === null
                                    ? "bg-slate-100 text-slate-600"
                                    : module.averageGrade >= 14
                                    ? "bg-green-100 text-green-700"
                                    : module.averageGrade >= 10
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {formatAvg(module.averageGrade)}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <SemesterChip
                                label="Non corrigés"
                                value={String(module.uncorrectedCount)}
                                tone="amber"
                              />
                              <SemesterChip
                                label="Retards"
                                value={String(module.lateCount)}
                                tone="red"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end border-t p-4">
              <button
                className="rounded border px-4 py-2 hover:bg-slate-50"
                onClick={closeStats}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}