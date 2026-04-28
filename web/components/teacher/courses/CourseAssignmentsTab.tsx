"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAssignments, deleteAssignment, getSubmissions, gradeSubmission } from "@/lib/assignments";
import { AssignmentForm } from "@/components/teacher/assignments/AssignmentForm";
import { downloadWithAuth } from "@/lib/download";
import { formatFileSize } from "@/lib/file-size";
import { openFileInBrowser, canPreviewInBrowser } from "@/lib/file-preview";

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

export function CourseAssignmentsTab({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissionsByAssignmentId, setSubmissionsByAssignmentId] = useState<Record<string, any[]>>({});
  const [gradingBySubmissionId, setGradingBySubmissionId] = useState<Record<string, boolean>>({});
  const [editBySubmissionId, setEditBySubmissionId] = useState<Record<string, boolean>>({});
  const [draftBySubmissionId, setDraftBySubmissionId] = useState<Record<string, { score: string; feedback: string }>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const data = await getAssignments(courseId);
      setAssignments(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [courseId]);

  async function onDelete(id: string) {
    const assignment = assignments.find(a => a.id === id);
    if (assignment) {
      setDeleteConfirm({ id, title: assignment.title });
    }
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    
    try {
      await deleteAssignment(deleteConfirm.id);
      await refresh();
      setDeleteConfirm(null);
    } catch (e: any) {
      console.error("Suppression impossible:", e);
      setDeleteConfirm(null);
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

  function setSubmissionDraftFromData(submission: any) {
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
      alert("Score invalide");
      return;
    }

    if (score < 0 || score > max) {
      alert(`Score doit être entre 0 et ${max}`);
      return;
    }

    setGradingBySubmissionId((prev) => ({ ...prev, [submissionId]: true }));
    try {
      const updated = await gradeSubmission(submissionId, score, draft?.feedback || undefined);

      // Forcer le rafraîchissement des soumissions pour plus de robustesse
      const subs = await getSubmissions(assignmentId);
      setSubmissionsByAssignmentId((prev) => ({ ...prev, [assignmentId]: subs }));

      setEditBySubmissionId((prev) => ({ ...prev, [submissionId]: false }));
      setSubmissionDraftFromData(updated);
      alert("Note enregistrée");
    } catch (e: any) {
      console.error("Grade error:", e);
      const msg = typeof e?.message === "string" ? e.message : "Erreur lors de la notation";
      alert(msg);
    } finally {
      setGradingBySubmissionId((prev) => ({ ...prev, [submissionId]: false }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Devoirs</h2>

        <button
          className="px-4 py-2 rounded-md bg-blue-600 text-white"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Fermer" : "Créer un devoir"}
        </button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="text-lg font-semibold mb-4">Créer un nouveau devoir</h3>
          <AssignmentForm
            defaultCourseId={courseId}
            onCreated={() => {
              setShowForm(false);
              refresh();
            }}
          />
        </div>
      )}

      {loading ? (
        <p>Chargement…</p>
      ) : assignments.length === 0 ? (
        <p className="text-zinc-600">Aucun devoir pour cette matière.</p>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a.id} className="border rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{a.title}</div>
                  {a.dueDate && <div className="text-sm text-zinc-600">Date limite : {new Date(a.dueDate).toLocaleString("fr-FR")}</div>}
                </div>

                <div className="flex gap-3">
                  <button 
                    className="px-3 py-2 rounded-md bg-zinc-100" 
                    onClick={() => toggleSubmissions(a.id)}
                  >
                    {submissionsByAssignmentId[a.id] ? "Masquer" : "Voir"} les soumissions
                  </button>
                  <button className="px-3 py-2 rounded-md bg-red-100 text-red-700" onClick={() => onDelete(a.id)}>
                    Supprimer
                  </button>
                </div>
              </div>

              {submissionsByAssignmentId[a.id] && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-slate-900 mb-4">
                    Soumissions ({submissionsByAssignmentId[a.id].length})
                  </h4>
                  {submissionsByAssignmentId[a.id].length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune soumission pour ce devoir.</p>
                  ) : (
                    <div className="space-y-4">
                      {submissionsByAssignmentId[a.id].map((s: any) => (
                        <div key={s.id} className="p-4 border border-slate-200 rounded-lg">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {s.student?.fullName} ({s.student?.email})
                              </p>
                              <p className="text-sm text-slate-600">Déposé: {new Date(s.submittedAt).toLocaleString("fr-FR")}</p>
                              {(() => {
                                const files = extractFiles(s);
                                
                                return files.length > 0 ? (
                                  <div className="space-y-2 mt-2">
                                    {files.map((file, index) => (
                                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-slate-800 truncate">{file.name ?? "Fichier"}</p>
                                          {(() => {
                                            const readableSize = formatFileSize(file.size);

                                            return readableSize ? (
                                              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                {readableSize}
                                              </span>
                                            ) : null;
                                          })()}
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                          <button
                                            type="button"
                                            onClick={() => void openFileInBrowser(file.url)}
                                            className="px-3 py-1 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                                          >
                                            {canPreviewInBrowser(file.type, file.name) ? "Consulter" : "Ouvrir"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => downloadWithAuth(file.url, file.name)}
                                            className="px-3 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                          >
                                            Télécharger
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500 mt-2">Aucun fichier</p>
                                );
                              })()}
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
                                  {s.score !== null ? (
                                    <span className="text-xs text-slate-600">
                                      Note: {s.score} / {a.maxScore ?? 20}
                                    </span>
                                  ) : null}
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
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Supprimer le devoir
            </h3>
            <p className="text-slate-600 mb-6">
              Es-tu sûr de vouloir supprimer le devoir "<span className="font-medium">{deleteConfirm.title}</span>" ?
              <br />
              <span className="text-red-600 text-sm">Cette action est irréversible.</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
