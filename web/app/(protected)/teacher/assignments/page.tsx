"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Course, getCourses } from "@/lib/courses";
import {
  Assignment,
  Submission,
  createAssignment,
  getAssignments,
  getSubmissions,
  gradeSubmission,
  uploadFile,
  deleteAssignment,
} from "@/lib/assignments";
import { useToast } from "@/lib/toast";
import { downloadWithAuth } from "@/lib/download";

function extractFiles(submission: any): Array<{ url: string; name?: string; size?: number; type?: string }> {
  // cas 1: tu as déjà un tableau (Prisma Json)
  if (Array.isArray(submission.fileUrls)) return submission.fileUrls;

  // cas 2: tu as une string JSON
  if (typeof submission.fileUrls === "string" && submission.fileUrls.trim() !== "") {
    try {
      const v = JSON.parse(submission.fileUrls);
      if (Array.isArray(v)) return v;
    } catch {}
  }

  // cas 3: ancien modèle: un seul fileUrl
  if (typeof submission.fileUrl === "string" && submission.fileUrl.trim() !== "") {
    return [{ url: submission.fileUrl, name: submission.fileName, size: submission.fileSize, type: submission.fileMimeType }];
  }

  return [];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function getMinDateTimeLocalValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);

  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function isPastDateTimeLocal(value: string) {
  if (!value) return false;

  const selectedDate = new Date(value);
  return selectedDate.getTime() <= Date.now();
}

export default function TeacherAssignmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissionsByAssignmentId, setSubmissionsByAssignmentId] = useState<Record<string, Submission[]>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState<string>("20");
  const [attachment, setAttachment] = useState<{ url: string; name?: string; size?: number; type?: string } | null>(null);
  const [formCourseId, setFormCourseId] = useState<string>("");

  const [gradingBySubmissionId, setGradingBySubmissionId] = useState<Record<string, boolean>>({});
  const [editBySubmissionId, setEditBySubmissionId] = useState<Record<string, boolean>>({});
  const [draftBySubmissionId, setDraftBySubmissionId] = useState<Record<string, { score: string; feedback: string }>>({});
  const [lastSavedBySubmissionId, setLastSavedBySubmissionId] = useState<Record<string, string>>({});
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);

  const minDueDate = getMinDateTimeLocalValue();

  const courseOptions = useMemo(() => {
    if (!courses || courses.length === 0) {
      return [{ id: "", title: "Tous les cours" }];
    }
    return [{ id: "", title: "Tous les cours" }, ...courses];
  }, [courses]);

  const filteredAssignments = useMemo(() => {
    const selectedId = String(selectedCourseId || '');
    
    if (!selectedId || selectedId === "") return assignments;
    
    return assignments.filter((a) => String(a.courseId) === selectedId);
  }, [assignments, selectedCourseId]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [coursesData, assignmentsData] = await Promise.all([
          getCourses(),
          getAssignments(),
        ]);
        setCourses(coursesData);
        setAssignments(assignmentsData);
      } catch (e: any) {
        setError(e?.message ?? "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Remove the incorrect useEffect that was causing the error
  // The submissions should only be loaded when toggleSubmissions is called

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!dueDate) return;
    if (isPastDateTimeLocal(dueDate)) {
      setError("La date limite doit être dans le futur.");
      toast.push("error", "La date limite doit être dans le futur.");
      return;
    }
    if (!formCourseId) {
      setError("Sélectionne un cours pour créer un devoir.");
      return;
    }

    const ms = Number(maxScore);
    if (Number.isNaN(ms) || ms <= 0 || ms > 1000) {
      setError("maxScore invalide");
      return;
    }

    setFormLoading(true);
    setError("");
    try {
      const created = await createAssignment(
        title,
        description || undefined,
        new Date(dueDate).toISOString(),
        formCourseId,
        {
          maxScore: ms,
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name,
          attachmentSize: attachment?.size,
          attachmentMimeType: attachment?.type,
        },
      );
      setAssignments((prev) => [created, ...prev]);
      setTitle("");
      setDescription("");
      setDueDate("");
      setMaxScore("20");
      setAttachment(null);
      setFormCourseId("");
      setShowForm(false);
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteAssignment(assignmentId: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce devoir ? Toutes les soumissions seront également supprimées.")) {
      return;
    }

    setDeletingAssignmentId(assignmentId);
    try {
      await deleteAssignment(assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      // Also remove submissions from state if they exist
      setSubmissionsByAssignmentId((prev) => {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });
      toast.push("success", "Devoir supprimé avec succès");
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
      toast.push("error", e?.message ?? "Erreur lors de la suppression");
    } finally {
      setDeletingAssignmentId(null);
    }
  }

  async function toggleSubmissions(assignmentId: string) {
    const existing = submissionsByAssignmentId[assignmentId];
    if (existing) {
      setSubmissionsByAssignmentId((prev) => {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });
    } else {
      try {
        const subs = await getSubmissions(assignmentId);
        setSubmissionsByAssignmentId((prev) => ({ ...prev, [assignmentId]: subs }));
      } catch (e: any) {
        console.error("Failed to load submissions", e);
      }
    }
  }

  function setSubmissionDraftFromData(submission: Submission) {
    setDraftBySubmissionId((prev) => ({
      ...prev,
      [submission.id]: {
        score: submission.score?.toString() ?? "",
        feedback: submission.feedback ?? "",
      },
    }));
  }

  async function handleGrade(submissionId: string, assignmentId: string) {
    const draft = draftBySubmissionId[submissionId];
    if (!draft) return;

    const score = Number(draft.score);
    const max = assignments.find((a) => a.id === assignmentId)?.maxScore ?? 20;

    if (Number.isNaN(score)) {
      setError("Score invalide");
      toast.push("error", "Score invalide");
      return;
    }

    if (score < 0 || score > max) {
      setError(`Score doit être entre 0 et ${max}`);
      toast.push("error", `Score doit être entre 0 et ${max}`);
      return;
    }

    setGradingBySubmissionId((prev) => ({ ...prev, [submissionId]: true }));
    try {
      const updated = await gradeSubmission(submissionId, score, draft?.feedback || undefined);

      setSubmissionsByAssignmentId((prev) => {
        const current = prev[assignmentId] ?? [];
        const next = current.map((s) => (s.id === submissionId ? updated : s));
        return { ...prev, [assignmentId]: next };
      });

      setEditBySubmissionId((prev) => ({ ...prev, [submissionId]: false }));
      setSubmissionDraftFromData(updated);
      setLastSavedBySubmissionId((prev) => ({ ...prev, [submissionId]: new Date().toISOString() }));
      toast.push("success", "Note enregistrée");
    } catch (e: any) {
      console.error("Grade error:", e);
      const msg = typeof e?.message === "string" ? e.message : "Erreur lors de la notation";
      setError(msg);
      toast.push("error", msg);
    } finally {
      setGradingBySubmissionId((prev) => ({ ...prev, [submissionId]: false }));
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh]">
      <header className="bg-white shadow-sm border border-slate-200 rounded-lg">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Devoirs</h1>
            <p className="text-sm text-slate-500 mt-1">Créez des devoirs et notez les soumissions</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            {showForm ? "Fermer" : "Créer un devoir"}
          </button>
        </div>
      </header>

      <main className="py-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Filtrer par cours</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            >
              {courseOptions.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Nouveau devoir</h2>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Titre</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cours *</label>
                  <select
                    value={formCourseId}
                    onChange={(e) => setFormCourseId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    required
                  >
                    <option value="">Sélectionner un cours</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date limite</label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    min={minDueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note max</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Fichier consigne (optionnel)</label>
                <input
                  type="file"
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setError("");
                    setFormLoading(true);
                    try {
                      const up = await uploadFile(file);
                      setAttachment({ url: up.fileUrl, name: file.name, size: file.size, type: file.type });
                      toast.push("success", "Fichier consigne uploadé");
                    } catch (err: any) {
                      setError(err?.message ?? "Erreur");
                      toast.push("error", err?.message ?? "Erreur upload");
                    } finally {
                      setFormLoading(false);
                    }
                  }}
                />
                {attachment && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-700 truncate">{attachment.name}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setTitle("");
                    setDescription("");
                    setDueDate("");
                    setMaxScore("20");
                    setAttachment(null);
                    setFormCourseId("");
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition"
                >
                  {formLoading ? "Création..." : "Créer le devoir"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Liste des devoirs</h2>
          </div>
          {filteredAssignments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {selectedCourseId ? "Aucun devoir pour ce cours." : "Aucun devoir pour le moment."}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredAssignments.map((a) => (
                <div key={a.id} className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-slate-900">{a.title}</h3>
                      <p className="text-sm text-slate-600">Cours: {a.course?.title}</p>
                      <p className="text-sm text-slate-600">Date limite: {formatDate(a.dueDate)}</p>
                      <p className="text-sm text-slate-600">Note max: {a.maxScore ?? 20}</p>
                      {a.description ? (
                        <p className="text-sm text-slate-700 mt-2">{a.description}</p>
                      ) : null}
                      {a.attachmentUrl ? (
                        <div className="mt-2">
                          <a
                            href={a.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            📎 {a.attachmentName || "Fichier consigne"}
                          </a>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleSubmissions(a.id)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                      >
                        {submissionsByAssignmentId[a.id] ? "Masquer" : "Voir"} les soumissions
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        disabled={deletingAssignmentId === a.id}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingAssignmentId === a.id ? "Suppression..." : "Supprimer"}
                      </button>
                    </div>
                  </div>

                  {submissionsByAssignmentId[a.id] ? (
                    <div className="mt-6">
                      <h4 className="text-md font-semibold text-slate-900 mb-4">
                        Soumissions ({submissionsByAssignmentId[a.id].length})
                      </h4>
                      {submissionsByAssignmentId[a.id].length === 0 ? (
                        <p className="text-sm text-slate-500">Aucune soumission pour ce devoir.</p>
                      ) : (
                        <div className="space-y-4">
                          {submissionsByAssignmentId[a.id].map((s) => (
                            <div key={s.id} className="p-4 border border-slate-200 rounded-lg">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 truncate">
                                    {s.student?.fullName} ({s.student?.email})
                                  </p>
                                  <p className="text-sm text-slate-600">Déposé: {formatDate(s.submittedAt)}</p>
                                  {(() => {
                                    const files = extractFiles(s);
                                    
                                    return files.length > 0 ? (
                                      <div className="space-y-2">
                                        {files.map((file: any, index: number) => (
                                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                              <p className="text-sm font-semibold text-slate-800 truncate">{file.name ?? "Fichier"}</p>
                                              {typeof file.size === "number" && (
                                                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">{Math.round(file.size / 1024)} KB</span>
                                              )}
                                            </div>
                                            <button
                                              onClick={() => downloadWithAuth(file.url, file.name)}
                                              className="shrink-0 px-3 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                            >
                                              Télécharger
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-500">Aucun fichier</p>
                                    );
                                  })()}

                                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                                    {s.correctedAt ? (
                                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                                        Corrigé
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                        En attente
                                      </span>
                                    )}
                                    {s.score !== null ? (
                                      <span className="text-xs text-slate-600">Note: {s.score} / {a.maxScore ?? 20}</span>
                                    ) : null}
                                    {s.correctedAt ? (
                                      <span className="text-xs text-slate-500">Corrigé: {formatDate(s.correctedAt)}</span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 border-t border-slate-200 pt-4">
                                {editBySubmissionId[s.id] ? (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
                                        <input
                                          type="number"
                                          min={0}
                                          max={a.maxScore ?? 20}
                                          value={draftBySubmissionId[s.id]?.score ?? ""}
                                          onChange={(e) =>
                                            setDraftBySubmissionId((prev) => ({
                                              ...prev,
                                              [s.id]: { ...prev[s.id], score: e.target.value },
                                            }))
                                          }
                                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                        />
                                      </div>
                                      <div className="flex items-end">
                                        <button
                                          onClick={() => handleGrade(s.id, a.id)}
                                          disabled={gradingBySubmissionId[s.id]}
                                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition"
                                        >
                                          {gradingBySubmissionId[s.id] ? "Enregistrement..." : "Enregistrer"}
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">Feedback</label>
                                      <textarea
                                        rows={3}
                                        value={draftBySubmissionId[s.id]?.feedback ?? ""}
                                        onChange={(e) =>
                                          setDraftBySubmissionId((prev) => ({
                                            ...prev,
                                            [s.id]: { ...prev[s.id], feedback: e.target.value },
                                          }))
                                        }
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <div>
                                      {s.feedback && (
                                        <div className="mb-2 p-2 bg-slate-50 rounded border border-slate-200">
                                          <p className="text-sm text-slate-700">{s.feedback}</p>
                                        </div>
                                      )}
                                      {lastSavedBySubmissionId[s.id] && (
                                        <p className="text-xs text-slate-500">Dernière sauvegarde: {formatDate(lastSavedBySubmissionId[s.id])}</p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setEditBySubmissionId((prev) => ({ ...prev, [s.id]: true }));
                                        setSubmissionDraftFromData(s);
                                      }}
                                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                                    >
                                      Noter
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
