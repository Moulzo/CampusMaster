"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Course, getCourses } from "@/lib/courses";
import {
  Assignment,
  Submission,
  createSubmission,
  getAssignments,
} from "@/lib/assignments";
import { Dropzone } from "@/components/Dropzone";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const enrolledCourses = useMemo(() => {
    if (!user) return [];
    return courses.filter((c) => c.students.some((s) => s.id === user.id));
  }, [courses, user]);

  const courseOptions = useMemo(() => {
    return [{ id: "", title: "Tous mes cours" } as any, ...enrolledCourses];
  }, [enrolledCourses]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(`/login?next=/student/assignments`);
      return;
    }

    if (user.role !== "STUDENT") {
      router.replace(`/forbidden`);
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const c = await getCourses();
        setCourses(c);
      } catch (e: any) {
        setError(e?.message ?? "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "STUDENT") return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const a = await getAssignments(selectedCourseId || undefined);
        // UI: ne montrer que les devoirs des cours où l'étudiant est inscrit
        const enrolledIds = new Set(enrolledCourses.map((c) => c.id));
        const filtered = a.filter((x) => enrolledIds.has(x.courseId));
        setAssignments(filtered);
      } catch (e: any) {
        setError(e?.message ?? "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCourseId, user?.id, enrolledCourses]);

  async function handleSubmit(assignmentId: string, fileUrl?: string) {
    setError("");
    setSubmittingId(assignmentId);
    try {
      await createSubmission(assignmentId, fileUrl);
      const a = await getAssignments(selectedCourseId || undefined);
      const enrolledIds = new Set(enrolledCourses.map((c) => c.id));
      setAssignments(a.filter((x) => enrolledIds.has(x.courseId)));
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
    } finally {
      setSubmittingId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh]">
      <header className="bg-white shadow-sm border border-slate-200 rounded-lg">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Devoirs</h1>
            <p className="text-sm text-slate-500 mt-1">Consultez vos devoirs et déposez vos fichiers</p>
          </div>
        </div>
      </header>

      <main className="py-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">Filtrer par cours</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          >
            {courseOptions.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          {enrolledCourses.length === 0 && (
            <p className="text-sm text-slate-500 mt-3">
              Tu n'es inscrit à aucun cours. Va dans "Mes cours" pour t'inscrire.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {assignments.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center">
              <p className="text-slate-600">Aucun devoir pour le moment.</p>
            </div>
          ) : (
            assignments.map((a) => {
              const mySubmission: Submission | undefined = user
                ? a.submissions?.find((s) => s.studentId === user.id)
                : undefined;

              return (
                <div key={a.id} className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-slate-900">{a.title}</h3>
                      <p className="text-sm text-slate-600">Cours: {a.course?.title}</p>
                      <p className="text-sm text-slate-600">Date limite: {formatDate(a.dueDate)}</p>
                      {a.description ? (
                        <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{a.description}</p>
                      ) : null}
                    </div>

                    <div className="w-full md:w-[420px] space-y-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-sm font-semibold text-slate-900">Ma soumission</p>
                        {mySubmission ? (
                          <div className="mt-2 text-sm text-slate-700 space-y-1">
                            <p>Déposée: {formatDate(mySubmission.submittedAt)}</p>
                            <p>Fichier: {mySubmission.fileUrl ?? "(aucun)"}</p>
                            <p>
                              Note: {mySubmission.score ?? "--"} / 20
                              {mySubmission.correctedAt ? ` (corrigé: ${formatDate(mySubmission.correctedAt)})` : ""}
                            </p>
                            {mySubmission.feedback ? (
                              <p className="text-slate-700">Feedback: {mySubmission.feedback}</p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-600">Aucune soumission pour le moment.</p>
                        )}
                      </div>

                      {!mySubmission && (
                        <div className="space-y-3">
                          <Dropzone
                            onFileUpload={(file) => {
                              // Pour l'instant on n'a pas d'upload réel côté API.
                              // On envoie un fileUrl "logique" basé sur le nom du fichier.
                              handleSubmit(a.id, `/uploads/${file.name}`);
                            }}
                            className=""
                          />

                          <button
                            onClick={() => handleSubmit(a.id)}
                            disabled={submittingId === a.id}
                            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition"
                          >
                            {submittingId === a.id ? "Envoi..." : "Soumettre sans fichier"}
                          </button>
                          <p className="text-xs text-slate-500">
                            L'upload réel de fichiers n'est pas encore branché: on stocke juste un `fileUrl`.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
