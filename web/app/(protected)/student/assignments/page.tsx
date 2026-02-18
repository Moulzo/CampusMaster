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
  uploadFile,
} from "@/lib/assignments";
import { Dropzone } from "@/components/Dropzone";
import { useToast } from "@/lib/toast";

interface FileInfo {
  url: string;
  name: string;
  size: number;
  type: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function isBeforeDueDate(dueDateIso: string) {
  const due = new Date(dueDateIso);
  return Date.now() <= due.getTime();
}

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [submissionOriginalNames, setSubmissionOriginalNames] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  async function handleUploadAndSubmit(assignmentId: string, files?: File[]) {
    console.log('handleUploadAndSubmit called', { assignmentId, files: files?.map(f => f.name), count: files?.length });
    
    if (!files || files.length === 0) {
      await handleSubmit(assignmentId);
      return;
    }

    try {
      // Upload tous les fichiers et récupérer leurs URLs
      const uploadedFiles: FileInfo[] = [];
      for (const file of files) {
        const up = await uploadFile(file);
        uploadedFiles.push({
          url: up.fileUrl,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }
      
      // Stocker les noms originaux pour le téléchargement
      if (user) {
        const key = `${user.id}-${assignmentId}`;
        setSubmissionOriginalNames(prev => ({
          ...prev,
          [key]: JSON.stringify(uploadedFiles.reduce((acc: Record<string, string>, f) => ({ ...acc, [f.url]: f.name }), {})
        )}));
      }
      
      // Envoyer le tableau JSON au backend
      await handleSubmit(assignmentId, JSON.stringify(uploadedFiles));
      setSelectedFiles([]); // Reset selected files after submission
    } catch (err) {
      console.error('uploadFiles error', err);
      setError(err instanceof Error ? err.message : 'Erreur upload');
      toast.push("error", err instanceof Error ? err.message : "Erreur upload");
    }
  }

  function handleFileSelect(files: File[]) {
    setSelectedFiles(files);
  }

  function handleAddFile(file: File) {
    setSelectedFiles(prev => [...prev, file]);
  }

  function handleRemoveFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(assignmentId: string, fileUrl?: string, originalName?: string) {
    setError("");
    setSubmittingId(assignmentId);
    try {
      await createSubmission(assignmentId, fileUrl);
      if (originalName && user) {
        const key = `${user.id}-${assignmentId}`;
        setSubmissionOriginalNames((prev) => ({ ...prev, [key]: originalName }));
      }
      toast.push("success", "Soumission envoyée");
      const a = await getAssignments(selectedCourseId || undefined);
      const enrolledIds = new Set(enrolledCourses.map((c) => c.id));
      setAssignments(a.filter((x) => enrolledIds.has(x.courseId)));
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
      toast.push("error", e?.message ?? "Erreur lors de la soumission");
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

              const canResubmit = mySubmission && !mySubmission.correctedAt && isBeforeDueDate(a.dueDate);

              return (
                <div key={a.id} className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-slate-900">{a.title}</h3>
                      <p className="text-sm text-slate-600">Cours: {a.course?.title}</p>
                      <p className="text-sm text-slate-600">Date limite: {formatDate(a.dueDate)}</p>
                      <p className="text-sm text-slate-600">Note max: {a.maxScore ?? 20}</p>
                      {a.description ? (
                        <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{a.description}</p>
                      ) : null}

                      {a.attachmentUrl ? (
                        <div className="mt-3 flex items-center gap-2">
                          <a
                            href={a.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={a.attachmentName ?? undefined}
                            className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                          >
                            Télécharger la consigne
                          </a>
                          <span className="text-xs text-slate-500 truncate">{a.attachmentName ?? a.attachmentUrl}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="w-full md:w-[420px] space-y-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-slate-900">Ma soumission</p>
                          {mySubmission ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                              Soumis
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                              Non soumis
                            </span>
                          )}
                        </div>
                        
                        {mySubmission ? (
                          <div className="mt-2 text-sm text-slate-700 space-y-1">
                            <p>Déposée: {formatDate(mySubmission.submittedAt)}</p>
                            <div className="space-y-2">
                              {(() => {
                                interface FileInfo {
                                  url: string;
                                  name: string;
                                  size: number;
                                  type: string;
                                }
                                
                                let filesArray: FileInfo[] = [];
                                if (mySubmission.fileUrls) {
                                  try {
                                    // Essayer de parser comme JSON
                                    const parsed = JSON.parse(mySubmission.fileUrls);
                                    if (Array.isArray(parsed)) {
                                      filesArray = parsed as FileInfo[];
                                    } else {
                                      // Si c'est une simple chaîne (compatibilité ancien format)
                                      filesArray = [{ url: mySubmission.fileUrls, name: 'file', size: 0, type: 'application/octet-stream' }];
                                    }
                                  } catch {
                                    // Si ce n'est pas du JSON, utiliser comme simple URL (compatibilité)
                                    filesArray = [{ url: mySubmission.fileUrls, name: 'file', size: 0, type: 'application/octet-stream' }];
                                  }
                                }
                                
                                return filesArray.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                                    <div className="flex items-center gap-2">
                                      <p className="truncate">{file.name}</p>
                                      <span className="text-xs text-slate-500">({Math.round((file.size || 0) / 1024)} KB)</span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        // TODO: Implémenter suppression de fichier individuel
                                        toast.push("info", "Suppression individuelle bientôt disponible");
                                      }}
                                      className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition"
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                ));
                              })()}
                            </div>
                            <p>
                              Note: {mySubmission.score ?? "--"} / {a.maxScore ?? 20}
                              {mySubmission.correctedAt ? ` (corrigé: ${formatDate(mySubmission.correctedAt)})` : ""}
                            </p>
                            {mySubmission.feedback ? (
                              <p className="text-slate-700">Feedback: {mySubmission.feedback}</p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-slate-600">
                            <p>Aucune soumission pour le moment.</p>
                          </div>
                        )}
                      </div>

                      {(!mySubmission || canResubmit) && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              {mySubmission ? "Modifier vos fichiers" : "Déposer vos fichiers"}
                            </label>
                            <input
                              type="file"
                              multiple
                              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  console.log('Student files input changed', files);
                                  handleFileSelect(files);
                                }
                              }}
                            />
                            
                            {selectedFiles.length > 0 && (
                              <div className="mt-2 space-y-2">
                                <p className="text-sm font-medium text-emerald-700">Fichiers sélectionnés ({selectedFiles.length}):</p>
                                {selectedFiles.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded">
                                    <div className="flex items-center gap-2">
                                      <p className="truncate text-sm">{file.name}</p>
                                      <span className="text-xs text-emerald-600">({Math.round(file.size / 1024)} KB)</span>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveFile(index)}
                                      className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition"
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => selectedFiles.length > 0 ? handleUploadAndSubmit(a.id, selectedFiles) : handleSubmit(a.id)}
                            disabled={submittingId === a.id}
                            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition"
                          >
                            {submittingId === a.id
                              ? "Envoi..."
                              : mySubmission
                              ? selectedFiles.length > 0
                                ? "Mettre à jour"
                                : "Modifier sans fichier"
                              : selectedFiles.length > 0
                                ? `Remettre (${selectedFiles.length} fichier${selectedFiles.length > 1 ? 's' : ''})`
                                : "Remettre sans fichier"}
                          </button>
                          <p className="text-xs text-slate-500">
                            Les fichiers sont uploadés sur l'API puis liés à la soumission via `fileUrl`.
                          </p>
                        </div>
                      )}

                      {mySubmission && !canResubmit ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-800">
                            {mySubmission.correctedAt
                              ? "Soumission corrigée : modification désactivée."
                              : "Date limite dépassée : modification désactivée."}
                          </p>
                        </div>
                      ) : null}
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
