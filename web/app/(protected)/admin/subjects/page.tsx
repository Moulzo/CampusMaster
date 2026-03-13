"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  getSubjects,
  getLearningModules,
  setSubjectModule,
  unsetSubjectModule,
  setSubjectTeachers,
  getTeachers,
  deleteSubject,
  Subject,
  LearningModule,
  createSubject,
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

function SubjectStatCard({
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

function SubjectChip({
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

export default function AdminSubjectsPage() {
  const toast = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [teachers, setTeachers] = useState<
    Array<{ id: string; email: string; fullName?: string | null; role: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [semesterId, setSemesterId] = useState<string>("");
  const [moduleIdFilter, setModuleIdFilter] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Subject | null>(null);
  const [editTeacherIds, setEditTeacherIds] = useState<string[]>([]);

  const [statsOpen, setStatsOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [coursesAnalytics, setCoursesAnalytics] = useState<AdminCourseAnalytics[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createModuleId, setCreateModuleId] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const didLoadModules = useRef(false);
  const didLoadTeachers = useRef(false);

  const moduleOptions = useMemo(() => {
    const opts = modules.map((m) => ({
      id: m.id,
      label: m.semester ? `${m.semester.name} / ${m.name}` : m.name,
      semesterId: m.semesterId,
    }));

    opts.sort((a, b) => a.label.localeCompare(b.label));

    return [{ id: "", label: "Aucun module", semesterId: "" }, ...opts];
  }, [modules]);

  const filteredSubjects = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return subjects.filter((s) => {
      const matchesText =
        !needle ||
        s.title.toLowerCase().includes(needle) ||
        s.description?.toLowerCase().includes(needle);

      const matchesSemester =
        !semesterId || (s.learningModule?.semester?.id === semesterId) || false;

      const matchesModule =
        !moduleIdFilter || (s.learningModuleId ?? "") === moduleIdFilter;

      return matchesText && matchesSemester && matchesModule;
    });
  }, [subjects, q, semesterId, moduleIdFilter]);

  async function refresh() {
    setLoading(true);
    setErr("");

    try {
      const subjectsPromise = getSubjects({ moduleId: moduleIdFilter });

      const modulesPromise = didLoadModules.current
        ? Promise.resolve(modules)
        : getLearningModules();

      const teachersPromise = didLoadTeachers.current
        ? Promise.resolve(teachers)
        : getTeachers();

      const [subjectsData, modulesData, teachersData] = await Promise.all([
        subjectsPromise,
        modulesPromise,
        teachersPromise,
      ]);

      setSubjects(subjectsData);

      if (!didLoadModules.current) {
        setModules(modulesData);
        didLoadModules.current = true;
      }

      if (!didLoadTeachers.current) {
        setTeachers(teachersData);
        didLoadTeachers.current = true;
      }
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function loadSubjectAnalyticsIfNeeded() {
    if (analyticsLoaded || analyticsLoading) return;

    setAnalyticsLoading(true);
    try {
      const data = await getAdminAnalyticsCourses();
      setCoursesAnalytics(data);
      setAnalyticsLoaded(true);
    } catch (e) {
      console.error("Erreur chargement analytics matières", e);
      toast.push("error", "Impossible de charger les statistiques des matières.");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [moduleIdFilter]);

  const uniqueSemesters = Array.from(
    new Set(modules.map((m) => m.semester?.id).filter(Boolean)),
  );
  const semesterOptions = uniqueSemesters.map((semesterId) => {
    const semester = modules.find((m) => m.semester?.id === semesterId);
    return (
      <option key={semesterId} value={semesterId}>
        {semester?.semester?.name ?? semester?.semester?.id ?? semester?.name}
      </option>
    );
  });

  async function onSetModule(subjectId: string, learningModuleId: string) {
    try {
      const updated = await setSubjectModule(subjectId, learningModuleId);
      setSubjects((prev) => prev.map((x) => (x.id === subjectId ? updated : x)));
      toast.push("success", "Matière affectée au module");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur affectation");
    }
  }

  async function onUnsetModule(subjectId: string) {
    try {
      const updated = await unsetSubjectModule(subjectId);
      setSubjects((prev) => prev.map((x) => (x.id === subjectId ? updated : x)));
      toast.push("success", "Matière désaffectée du module");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur désaffectation");
    }
  }

  async function onDeleteSubject(subjectId: string) {
    if (!confirm("Supprimer cette matière ?")) return;

    try {
      await deleteSubject(subjectId);
      setSubjects((prev) => prev.filter((x) => x.id !== subjectId));
      toast.push("success", "Matière supprimée");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur suppression");
    }
  }

  function openTeachersModal(subject: Subject) {
    setEditCourse(subject);
    setEditTeacherIds((subject.teachers ?? []).map((t: any) => t.id));
    setEditOpen(true);
  }

  function closeTeachersModal() {
    setEditOpen(false);
    setEditCourse(null);
    setEditTeacherIds([]);
  }

  async function openStats(subject: Subject) {
    setSelectedSubjectId(subject.id);
    setStatsOpen(true);
    await loadSubjectAnalyticsIfNeeded();
  }

  function closeStats() {
    setStatsOpen(false);
    setSelectedSubjectId(null);
  }

  function getModuleInfo(subject: Subject) {
    const mod = subject.learningModule;
    if (!mod) return "-";
    return mod.semester ? `${mod.semester.name} / ${mod.name}` : mod.name;
  }

  async function handleCreateSubject() {
    const title = createTitle.trim();
    if (!title) {
      toast.push("error", "Le titre est obligatoire");
      return;
    }

    setCreateLoading(true);
    setErr("");

    try {
      const created = await createSubject({
        title,
        description: createDescription.trim() ? createDescription.trim() : null,
        learningModuleId: createModuleId ? createModuleId : null,
      });

      setSubjects((prev) => [created, ...prev]);
      setCreateTitle("");
      setCreateDescription("");
      setCreateModuleId("");

      toast.push("success", "Matière créée");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur création matière");
    } finally {
      setCreateLoading(false);
    }
  }

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) ?? null,
    [subjects, selectedSubjectId],
  );

  const selectedSubjectAnalytics = useMemo(
    () => coursesAnalytics.find((c) => c.courseId === selectedSubjectId) ?? null,
    [coursesAnalytics, selectedSubjectId],
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Matières (Courses)</h1>
        <p className="text-slate-600">Affecter les matières aux modules et semestres.</p>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Rechercher une matière..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />

          <select
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Tous les semestres</option>
            {semesterOptions}
          </select>

          <select
            value={moduleIdFilter}
            onChange={(e) => setModuleIdFilter(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Tous les modules</option>
            {modules
              .filter((m) => !semesterId || m.semesterId === semesterId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.semester ? `${m.semester.name} / ${m.name}` : m.name}
                </option>
              ))}
          </select>

          <div className="flex items-center">
            {loading && <span className="text-sm text-slate-600">Chargement...</span>}
            {err && <span className="text-sm text-red-600">{err}</span>}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Créer une matière</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Titre *"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />

          <input
            type="text"
            placeholder="Description (optionnel)"
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />

          <select
            value={createModuleId}
            onChange={(e) => setCreateModuleId(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Module (optionnel)</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.semester ? `${m.semester.name} / ${m.name}` : m.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateSubject}
            disabled={createLoading || !createTitle.trim()}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-blue-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {createLoading ? "Création..." : "Créer"}
          </button>
        </div>
      </div>

      {loading ? (
        <div>Chargement…</div>
      ) : filteredSubjects.length === 0 ? (
        <div className="text-slate-600">Aucune matière trouvée.</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Matière</th>
                <th className="text-left p-3">Professeurs</th>
                <th className="text-left p-3">Semestre/Module actuel</th>
                <th className="text-left p-3">Affecter au module</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="border-t">
                  <td className="p-3 font-medium">{subject.title}</td>
                  <td className="p-3">
                    <div className="space-y-1">
                      {(subject.teachers ?? []).length === 0 ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        (subject.teachers ?? []).map((t: any) => (
                          <div key={t.id}>{t.fullName || t.email}</div>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-3">{getModuleInfo(subject)}</td>
                  <td className="p-3">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={subject.learningModuleId || ""}
                      onChange={async (e) => {
                        const moduleId = e.target.value;
                        if (moduleId) {
                          await onSetModule(subject.id, moduleId);
                        } else {
                          await onUnsetModule(subject.id);
                        }
                      }}
                    >
                      <option value="">Aucun module</option>
                      {modules
                        .filter((m) => !semesterId || m.semesterId === semesterId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.semester ? `${m.semester.name} / ${m.name}` : m.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                        onClick={() => openStats(subject)}
                      >
                        Stats
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-slate-100"
                        onClick={() => openTeachersModal(subject)}
                      >
                        Gérer profs
                      </button>
                      {subject.learningModuleId && (
                        <button
                          className="px-3 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
                          onClick={() => onUnsetModule(subject.id)}
                        >
                          Désaffecter
                        </button>
                      )}
                      <button
                        className="px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                        onClick={() => onDeleteSubject(subject.id)}
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

      {editOpen && editCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeTeachersModal}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="text-lg font-semibold">Gérer les professeurs</div>
              <div className="text-sm text-slate-600">
                Matière : <span className="font-medium">{editCourse.title}</span>
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-2">
                {teachers
                  .filter((t) => t.role === "TEACHER")
                  .map((teacher) => (
                    <label key={teacher.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editTeacherIds.includes(teacher.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditTeacherIds((prev) => [...prev, teacher.id]);
                          } else {
                            setEditTeacherIds((prev) =>
                              prev.filter((id) => id !== teacher.id),
                            );
                          }
                        }}
                      />
                      <span>{teacher.fullName || teacher.email}</span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded border border-slate-300"
                onClick={closeTeachersModal}
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white"
                onClick={async () => {
                  try {
                    const updated = await setSubjectTeachers(editCourse.id, editTeacherIds);
                    setSubjects((prev) => prev.map((x) => (x.id === editCourse.id ? updated : x)));
                    toast.push("success", "Professeurs mis à jour");
                    closeTeachersModal();
                  } catch (e: any) {
                    toast.push("error", e?.message ?? "Erreur");
                  }
                }}
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
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b p-4">
              <div className="text-lg font-semibold">
                Statistiques de la matière
                {selectedSubject?.title ? ` — ${selectedSubject.title}` : ""}
              </div>
              <div className="text-sm text-slate-600">
                Vue synthétique de la matière sélectionnée.
              </div>
            </div>

            <div className="space-y-6 p-4">
              {analyticsLoading ? (
                <div className="text-sm text-slate-500">Chargement des statistiques…</div>
              ) : !selectedSubjectAnalytics ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Aucune donnée analytique disponible pour cette matière.
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedSubjectAnalytics.courseTitle}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedSubjectAnalytics.semesterName || selectedSubjectAnalytics.learningModuleName
                        ? `${selectedSubjectAnalytics.semesterName ?? "Sans semestre"} / ${selectedSubjectAnalytics.learningModuleName ?? "Sans module"}`
                        : "Analyse pédagogique de la matière sélectionnée."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <SubjectStatCard
                      label="Moyenne"
                      value={formatAvg(selectedSubjectAnalytics.averageGrade)}
                      sub="Normalisée sur 20"
                    />
                    <SubjectStatCard
                      label="Taux de rendu"
                      value={formatPercent(selectedSubjectAnalytics.submissionRate)}
                      sub={`${selectedSubjectAnalytics.deliveredAssignmentCount} rendus uniques / ${selectedSubjectAnalytics.expectedSubmissions} attendus`}
                    />
                    <SubjectStatCard
                      label="Devoirs"
                      value={String(selectedSubjectAnalytics.assignmentCount)}
                      sub="Nombre de devoirs de la matière"
                    />
                    <SubjectStatCard
                      label="Étudiants"
                      value={String(selectedSubjectAnalytics.studentCount)}
                      sub="Étudiants éligibles"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <SubjectChip
                      label="Rendus uniques"
                      value={String(selectedSubjectAnalytics.deliveredAssignmentCount)}
                      tone="blue"
                    />
                    <SubjectChip
                      label="Soumissions"
                      value={String(selectedSubjectAnalytics.submissionCount)}
                      tone="green"
                    />
                    <SubjectChip
                      label="Attendus"
                      value={String(selectedSubjectAnalytics.expectedSubmissions)}
                      tone="amber"
                    />
                    <SubjectChip
                      label="Module"
                      value={selectedSubjectAnalytics.learningModuleName ?? "Aucun"}
                      tone="purple"
                    />
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-900">Résumé</h4>
                    <div className="mt-2 text-sm text-slate-600 space-y-1">
                      <div>
                        <span className="font-medium">Matière :</span>{" "}
                        {selectedSubjectAnalytics.courseTitle}
                      </div>
                      <div>
                        <span className="font-medium">Semestre :</span>{" "}
                        {selectedSubjectAnalytics.semesterName ?? "—"}
                      </div>
                      <div>
                        <span className="font-medium">Module :</span>{" "}
                        {selectedSubjectAnalytics.learningModuleName ?? "—"}
                      </div>
                      <div>
                        <span className="font-medium">Soumissions totales :</span>{" "}
                        {selectedSubjectAnalytics.submissionCount}
                      </div>
                    </div>
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
