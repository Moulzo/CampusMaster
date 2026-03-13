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
import {
  getAdminAnalyticsCourses,
  type AdminCourseAnalytics,
} from "@/lib/admin-analytics";
import { useToast } from "@/lib/toast";

function formatAvg(v: number | null) {
  return v === null ? "—" : `${v.toFixed(2)} / 20`;
}

function formatPercent(v: number | null) {
  return v === null ? "—" : `${v.toFixed(1)}%`;
}

function statToneClasses(tone: "blue" | "green" | "amber" | "purple") {
  return {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  }[tone];
}

function ModuleStatCard({
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

function ModuleChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "amber" | "purple";
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

type ModuleAnalyticsSummary = {
  moduleId: string;
  moduleName: string;
  semesterName: string | null;
  courseCount: number;
  assignmentCount: number;
  expectedSubmissions: number;
  submissionCount: number;
  deliveredAssignmentCount: number;
  submissionRate: number | null;
  averageGrade: number | null;
  courses: AdminCourseAnalytics[];
};

function buildModuleAnalyticsSummary(
  module: LearningModule,
  coursesAnalytics: AdminCourseAnalytics[],
): ModuleAnalyticsSummary {
  const moduleCourses = coursesAnalytics.filter(
    (c) => c.learningModuleId === module.id,
  );

  const courseCount = moduleCourses.length;
  const assignmentCount = moduleCourses.reduce((sum, c) => sum + c.assignmentCount, 0);
  const expectedSubmissions = moduleCourses.reduce(
    (sum, c) => sum + c.expectedSubmissions,
    0,
  );
  const submissionCount = moduleCourses.reduce((sum, c) => sum + c.submissionCount, 0);
  const deliveredAssignmentCount = moduleCourses.reduce(
    (sum, c) => sum + c.deliveredAssignmentCount,
    0,
  );

  const gradedCourses = moduleCourses.filter((c) => c.averageGrade !== null);
  const averageGrade =
    gradedCourses.length > 0
      ? gradedCourses.reduce((sum, c) => sum + (c.averageGrade ?? 0), 0) /
        gradedCourses.length
      : null;

  const submissionRate =
    expectedSubmissions > 0 ? (submissionCount / expectedSubmissions) * 100 : null;

  return {
    moduleId: module.id,
    moduleName: module.name,
    semesterName:
      module.semester?.name ??
      moduleCourses.find((c) => c.semesterName)?.semesterName ??
      null,
    courseCount,
    assignmentCount,
    expectedSubmissions,
    submissionCount,
    deliveredAssignmentCount,
    submissionRate,
    averageGrade,
    courses: moduleCourses,
  };
}

export default function AdminModulesPage() {
  const toast = useToast();

  const [semesters, setSemesters] = useState<Semester[]>([]);

  const [filterSemesterId, setFilterSemesterId] = useState<string>("");
  const [createSemesterId, setCreateSemesterId] = useState<string>("");

  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSemesterId, setEditSemesterId] = useState<string>("");

  const [statsOpen, setStatsOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const [coursesAnalytics, setCoursesAnalytics] = useState<AdminCourseAnalytics[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  const semesterFilterOptions = useMemo(
    () => [{ id: "", name: "Tous les semestres" }, ...semesters],
    [semesters],
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

  async function loadCourseAnalyticsIfNeeded() {
    if (analyticsLoaded || analyticsLoading) return;

    setAnalyticsLoading(true);
    try {
      const data = await getAdminAnalyticsCourses();
      setCoursesAnalytics(data);
      setAnalyticsLoaded(true);
    } catch (e) {
      console.error("Erreur chargement analytics modules", e);
      toast.push("error", "Impossible de charger les statistiques des modules.");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const s = await getSemesters();
        setSemesters(s);
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

      if (!filterSemesterId || filterSemesterId === createSemesterId) {
        setModules((prev) => [created, ...prev]);
      } else {
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

  async function openStats(moduleId: string) {
    setSelectedModuleId(moduleId);
    setStatsOpen(true);
    await loadCourseAnalyticsIfNeeded();
  }

  function closeStats() {
    setStatsOpen(false);
    setSelectedModuleId(null);
  }

  const selectedModule = useMemo(
    () => modules.find((m) => m.id === selectedModuleId) ?? null,
    [modules, selectedModuleId],
  );

  const selectedModuleAnalytics = useMemo(() => {
    if (!selectedModule) return null;
    return buildModuleAnalyticsSummary(selectedModule, coursesAnalytics);
  }, [selectedModule, coursesAnalytics]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Modules</h1>
        <p className="text-slate-600">Créer et gérer les modules par semestre.</p>
      </div>

      <div className="space-y-3 rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Création</div>

          {!createOpen ? (
            <button
              onClick={() => setCreateOpen(true)}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              + Créer un module
            </button>
          ) : (
            <button
              onClick={() => {
                setCreateOpen(false);
                setName("");
                setDescription("");
              }}
              className="rounded border px-4 py-2 hover:bg-slate-50"
            >
              Annuler
            </button>
          )}
        </div>

        {createOpen && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Semestre (création)
                </label>
                <select
                  className="w-full rounded border px-3 py-2"
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
                <p className="text-xs text-slate-500">
                  Le module sera rattaché à ce semestre.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Nom du module
                </label>
                <input
                  className="w-full rounded border px-3 py-2"
                  placeholder="Ex : Informatique"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Nom affiché côté étudiant / admin.
                </p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Description (optionnel)
                </label>
                <input
                  className="w-full rounded border px-3 py-2"
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
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </>
        )}
      </div>

      <div className="space-y-2 rounded-lg border bg-white p-4">
        <div className="font-semibold">Filtrer la liste</div>

        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Semestre</label>
            <select
              className="w-full rounded border px-3 py-2"
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
              Affiche les modules d&apos;un semestre (ou tous).
            </p>
          </div>

          <div className="flex md:justify-end">
            <button
              className="rounded border px-4 py-2 hover:bg-slate-50"
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

      {err && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div>Chargement…</div>
      ) : modules.length === 0 ? (
        <div className="text-slate-600">Aucun module.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">Nom</th>
                <th className="p-3 text-left">Semestre</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-right">Actions</th>
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
                        className="rounded bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-100"
                        onClick={() => openStats(m.id)}
                      >
                        Stats
                      </button>
                      <button
                        className="rounded bg-slate-100 px-3 py-1 hover:bg-slate-200"
                        onClick={() => openEdit(m)}
                      >
                        Modifier
                      </button>
                      <button
                        className="rounded bg-red-100 px-3 py-1 text-red-700 hover:bg-red-200"
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
              <div className="text-lg font-semibold">Modifier un module</div>
              <div className="text-sm text-slate-600">
                Mets à jour le nom, la description et le semestre.
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

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Description (optionnel)
                </label>
                <input
                  className="w-full rounded border px-3 py-2"
                  placeholder="Optionnel"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Semestre</label>
                <select
                  className="w-full rounded border px-3 py-2"
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

            <div className="flex justify-end gap-2 border-t p-4">
              <button
                className="rounded border px-4 py-2 hover:bg-slate-50"
                onClick={closeEdit}
              >
                Annuler
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                onClick={onSaveEdit}
                disabled={!editName.trim().length || !editSemesterId}
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
            className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl border bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b p-4">
              <div className="text-lg font-semibold">
                Statistiques du module
                {selectedModule?.name ? ` — ${selectedModule.name}` : ""}
              </div>
              <div className="text-sm text-slate-600">
                Vue synthétique du module sélectionné.
              </div>
            </div>

            <div className="space-y-6 p-4">
              {analyticsLoading ? (
                <div className="text-sm text-slate-500">Chargement des statistiques…</div>
              ) : !selectedModuleAnalytics ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Aucune donnée analytique disponible pour ce module.
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedModuleAnalytics.moduleName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedModuleAnalytics.semesterName
                        ? `Semestre : ${selectedModuleAnalytics.semesterName}`
                        : "Analyse pédagogique du module sélectionné."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <ModuleStatCard
                      label="Moyenne du module"
                      value={formatAvg(selectedModuleAnalytics.averageGrade)}
                      sub="Moyenne des matières notées"
                    />
                    <ModuleStatCard
                      label="Taux de rendu"
                      value={formatPercent(selectedModuleAnalytics.submissionRate)}
                      sub={`${selectedModuleAnalytics.submissionCount} rendus / ${selectedModuleAnalytics.expectedSubmissions} attendus`}
                    />
                    <ModuleStatCard
                      label="Matières"
                      value={String(selectedModuleAnalytics.courseCount)}
                      sub="Nombre de matières rattachées"
                    />
                    <ModuleStatCard
                      label="Devoirs"
                      value={String(selectedModuleAnalytics.assignmentCount)}
                      sub="Total des devoirs du module"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <ModuleChip
                      label="Rendus uniques"
                      value={String(selectedModuleAnalytics.deliveredAssignmentCount)}
                      tone="blue"
                    />
                    <ModuleChip
                      label="Soumissions"
                      value={String(selectedModuleAnalytics.submissionCount)}
                      tone="green"
                    />
                    <ModuleChip
                      label="Attendus"
                      value={String(selectedModuleAnalytics.expectedSubmissions)}
                      tone="amber"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Matières du module
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Comparaison des matières selon la moyenne, le taux de rendu
                        et le volume de devoirs.
                      </p>
                    </div>

                    {selectedModuleAnalytics.courses.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        Aucune matière analytique disponible pour ce module.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {selectedModuleAnalytics.courses.map((course) => (
                          <div
                            key={course.courseId}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {course.courseTitle}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {course.assignmentCount} devoir(s)
                                </div>
                              </div>

                              <div
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                  course.averageGrade === null
                                    ? "bg-slate-100 text-slate-600"
                                    : course.averageGrade >= 14
                                    ? "bg-green-100 text-green-700"
                                    : course.averageGrade >= 10
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {formatAvg(course.averageGrade)}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <ModuleChip
                                label="Taux"
                                value={formatPercent(course.submissionRate)}
                                tone="blue"
                              />
                              <ModuleChip
                                label="Rendus uniques"
                                value={String(course.deliveredAssignmentCount)}
                                tone="green"
                              />
                            </div>

                            <div className="mt-3 text-xs text-slate-500">
                              {course.submissionCount} soumission(s) • {course.expectedSubmissions} attendu(s)
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