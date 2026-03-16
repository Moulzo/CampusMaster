"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminGetUser, type AdminUser, adminGetStudentAnalytics, type AdminStudentAnalytics } from "@/lib/admin-users";
import {
  getLearningModules,
  setStudentModule,
  unsetStudentModule,
  type LearningModule,
  type Student,
} from "@/lib/admin-academics";
import { useToast } from "@/lib/toast";
import { getRoleLabel } from "@/lib/role-labels";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type StudentDetail = AdminUser | Student;

export default function AdminStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const studentId = params?.id;
  const toast = useToast();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [analytics, setAnalytics] = useState<AdminStudentAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const sortedModules = useMemo(() => {
    return [...modules].sort((a, b) => {
      const aLabel = a.semester ? `${a.semester.name} / ${a.name}` : a.name;
      const bLabel = b.semester ? `${b.semester.name} / ${b.name}` : b.name;
      return aLabel.localeCompare(bLabel);
    });
  }, [modules]);

  function moduleLabel(module: LearningModule) {
    return module.semester ? `${module.semester.name} / ${module.name}` : module.name;
  }

  const semesterChartData = useMemo(() => {
    return (
      analytics?.semesters.map((semester) => ({
        name: semester.semesterName,
        averageGrade: semester.averageGrade,
      })) ?? []
    );
  }, [analytics]);

  const selectedSemester = useMemo(() => {
    return analytics?.semesters.find((s) => s.semesterId === selectedSemesterId) ?? null;
  }, [analytics, selectedSemesterId]);

  const selectedSubject = useMemo(() => {
    return selectedSemester?.subjects.find((s) => s.subjectId === selectedSubjectId) ?? null;
  }, [selectedSemester, selectedSubjectId]);

  const subjectChartData = useMemo(() => {
    return (
      selectedSubject?.assignments.map((assignment, index) => ({
        name: `D${index + 1}`,
        fullName: assignment.assignmentTitle,
        grade: assignment.grade,
        submittedAt: assignment.submittedAt,
      })) ?? []
    );
  }, [selectedSubject]);

  async function refresh() {
    if (!studentId) return;

    setLoading(true);
    setErr("");
    try {
      const [userData, modulesData] = await Promise.all([
        adminGetUser(studentId),
        getLearningModules(),
      ]);

      setStudent(userData);
      setModules(modulesData);
      setSelectedModuleId(userData.learningModuleId ?? "");
    } catch (e: any) {
      setErr(e?.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    if (!studentId) return;

    setAnalyticsLoading(true);
    try {
      const analyticsData = await adminGetStudentAnalytics(studentId);
      setAnalytics(analyticsData);
      
      const currentSemesterId = student?.learningModule?.semester?.id;
      
      const defaultSemester =
        analyticsData.semesters.find(
          (semester) => semester.semesterId === currentSemesterId,
        ) ?? analyticsData.semesters[0];

      setSelectedSemesterId(defaultSemester?.semesterId ?? "");
      setSelectedSubjectId(defaultSemester?.subjects[0]?.subjectId ?? "");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur lors du chargement des analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function onSaveModule() {
    if (!studentId || !student) return;

    setSaving(true);
    try {
      if (selectedModuleId) {
        const updated = await setStudentModule(studentId, selectedModuleId);
        setStudent(updated);

        if (updated.warning) {
          toast.push("warning", updated.warning);
        } else {
          toast.push("success", "Étudiant affecté au module");
        }
      } else {
        const updated = await unsetStudentModule(studentId);
        setStudent(updated);
        toast.push("success", "Étudiant désaffecté du module");
      }
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur lors de l'affectation");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [studentId]);

  useEffect(() => {
    if (studentId && student) {
      loadAnalytics();
    }
  }, [studentId, student]);

  useEffect(() => {
    if (!selectedSemester) {
      setSelectedSubjectId("");
      return;
    }

    const stillExists = selectedSemester.subjects.some(
      (subject) => subject.subjectId === selectedSubjectId,
    );

    if (!stillExists) {
      setSelectedSubjectId(selectedSemester.subjects[0]?.subjectId ?? "");
    }
  }, [selectedSemester, selectedSubjectId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/students"
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            ← Retour aux étudiants
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Fiche étudiant</h1>
          <p className="text-slate-600">
            Gestion individuelle et suivi de l'étudiant.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-600">Chargement…</div>
      ) : err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {err}
        </div>
      ) : !student ? (
        <div className="text-slate-600">Étudiant introuvable.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2 rounded-lg border bg-white p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Informations</h2>
                <p className="text-sm text-slate-500">
                  Données principales de l'étudiant.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-slate-500">Nom complet</div>
                  <div className="mt-1 text-slate-900">{student.fullName}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-500">Email</div>
                  <div className="mt-1 text-slate-900">{student.email}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-500">Rôle</div>
                  <div className="mt-1 text-slate-900">{getRoleLabel(student.role)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-500">Module actuel</div>
                  <div className="mt-1 text-slate-900">
                    {student.learningModule
                      ? student.learningModule.semester
                        ? `${student.learningModule.semester.name} / ${student.learningModule.name}` 
                        : student.learningModule.name
                      : "Aucun module"}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-500">Créé le</div>
                  <div className="mt-1 text-slate-900">
                    {new Date(student.createdAt).toLocaleString("fr-FR")}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-500">Mis à jour le</div>
                  <div className="mt-1 text-slate-900">
                    {new Date(student.updatedAt).toLocaleString("fr-FR")}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Affectation</h2>
                <p className="text-sm text-slate-500">
                  Modifier le module de l'étudiant.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Module / filière
                </label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  disabled={saving}
                >
                  <option value="">Aucun module</option>
                  {sortedModules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {moduleLabel(module)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                  onClick={onSaveModule}
                  disabled={saving || (student.learningModuleId ?? "") === selectedModuleId}
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Suivi académique</h2>
              <p className="mt-1 text-sm text-slate-500">
                Évolution des performances académiques de l'étudiant.
              </p>
            </div>

            {analyticsLoading ? (
              <div className="text-slate-600">Chargement des analytics...</div>
            ) : !analytics ? (
              <div className="text-slate-600">Aucune donnée analytics disponible.</div>
            ) : analytics.semesters.length === 0 ? (
              <div className="text-slate-600">Aucune performance académique enregistrée.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  <div className="xl:col-span-2 rounded-lg border border-slate-200 p-4">
                    <div className="mb-3">
                      <h3 className="font-medium text-slate-900">Évolution entre les semestres</h3>
                      <p className="text-sm text-slate-500">
                        Moyennes semestrielles de l'étudiant.
                      </p>
                    </div>

                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={semesterChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis domain={[0, 20]} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="averageGrade"
                          stroke="#2563eb"
                          strokeWidth={3}
                          dot={{ r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Semestre</label>
                      <select
                        className="mt-1 w-full rounded border px-3 py-2"
                        value={selectedSemesterId}
                        onChange={(e) => setSelectedSemesterId(e.target.value)}
                      >
                        {analytics.semesters.map((semester) => (
                          <option key={semester.semesterId} value={semester.semesterId}>
                            {semester.semesterName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSemester && (
                      <div className="rounded-lg bg-slate-50 p-4">
                        <div className="text-sm text-slate-500">Moyenne du semestre</div>
                        <div className="mt-1 text-2xl font-bold text-slate-900">
                          {selectedSemester.averageGrade === null
                            ? "—"
                            : `${selectedSemester.averageGrade.toFixed(2)} / 20`}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {selectedSemester.subjects.length} matière{selectedSemester.subjects.length > 1 ? "s" : ""}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedSemester && (
                  <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900">
                          Détail du semestre — {selectedSemester.semesterName}
                        </h3>
                        <p className="text-sm text-slate-500">
                          Sélectionne une matière pour voir l'évolution des notes.
                        </p>
                      </div>

                      <div className="w-full md:w-80">
                        <label className="text-sm font-medium text-slate-700">Matière</label>
                        <select
                          className="mt-1 w-full rounded border px-3 py-2"
                          value={selectedSubjectId}
                          onChange={(e) => setSelectedSubjectId(e.target.value)}
                        >
                          {selectedSemester.subjects.map((subject) => (
                            <option key={subject.subjectId} value={subject.subjectId}>
                              {subject.subjectTitle}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedSubject ? (
                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        <div className="xl:col-span-2 rounded-lg border border-slate-200 p-4">
                          <div className="mb-3">
                            <h4 className="font-medium text-slate-900">
                              Évolution des notes — {selectedSubject.subjectTitle}
                            </h4>
                            <p className="text-sm text-slate-500">
                              Devoirs classés dans l'ordre chronologique.
                            </p>
                          </div>

                          {subjectChartData.length === 0 ? (
                            <div className="text-sm text-slate-500">
                              Aucun devoir corrigé pour cette matière.
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height={260}>
                              <LineChart data={subjectChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                                <YAxis domain={[0, 20]} tick={{ fill: "#64748b", fontSize: 12 }} />
                                <Tooltip
                                  formatter={(value: any) => [
                                    value === null || value === undefined ? "—" : `${Number(value).toFixed(2)} / 20`,
                                    "Note",
                                  ]}
                                  labelFormatter={(_, payload) =>
                                    payload?.[0]?.payload?.fullName ?? ""
                                  }
                                />
                                <Line
                                  type="monotone"
                                  dataKey="grade"
                                  stroke="#16a34a"
                                  strokeWidth={3}
                                  dot={{ r: 5 }}
                                  activeDot={{ r: 7 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        <div className="rounded-lg border border-slate-200 p-4">
                          <div className="text-sm text-slate-500">Moyenne matière</div>
                          <div className="mt-1 text-2xl font-bold text-slate-900">
                            {selectedSubject.averageGrade === null
                              ? "—"
                              : `${selectedSubject.averageGrade.toFixed(2)} / 20`}
                          </div>

                          <div className="mt-4 space-y-3">
                            {selectedSubject.assignments.map((assignment) => (
                              <div
                                key={assignment.assignmentId}
                                className="rounded border border-slate-200 p-3"
                              >
                                <div className="font-medium text-slate-900">
                                  {assignment.assignmentTitle}
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                  Note : {assignment.grade.toFixed(2)} / 20
                                </div>
                                <div className="text-xs text-slate-400">
                                  Rendu le {new Date(assignment.submittedAt).toLocaleDateString("fr-FR")}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">
                        Aucune matière disponible pour ce semestre.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
