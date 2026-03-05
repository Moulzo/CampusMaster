"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listCourseThreads,
  createCourseThread,
  deleteThread,
  Thread,
} from "@/lib/discussions";

export function TeacherCourseDiscussionsTab({ courseId }: { courseId: string }) {
  const router = useRouter();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await listCourseThreads(courseId);
      setThreads(data);
    } catch (e: any) {
      setError(e?.message ?? "Erreur chargement discussions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!courseId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (t.length < 3) return;

    try {
      setSubmitLoading(true);
      setError("");
      const created = await createCourseThread(courseId, t);
      setCreating(false);
      setTitle("");
      setThreads((prev) => [created, ...prev]);
    } catch (e: any) {
      setError(e?.message ?? "Erreur création discussion");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDeleteThread(threadId: string, e: React.MouseEvent) {
    e.stopPropagation(); // Éviter de naviguer vers la discussion
    
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette discussion ?")) return;

    try {
      await deleteThread(threadId);
      setThreads(threads.filter(t => t.id !== threadId));
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la suppression");
    }
  }

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Erreur</h2>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Discussions</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + Nouvelle discussion
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500">Chargement…</div>
      ) : threads.length === 0 ? (
        <div className="text-slate-500 text-center py-10">
          Aucune discussion pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((th) => (
            <div
              key={th.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer"
              onClick={() =>
                router.push(
                  `/teacher/courses/${courseId}/discussions/${th.id}` 
                )
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{th.title}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Par {th.createdBy?.fullName ?? "Utilisateur"} •{" "}
                    {th.createdBy?.role ?? ""} • {th._count?.messages ?? 0} message
                    {th._count?.messages === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-slate-500">
                    {th.createdAt
                      ? new Date(th.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })
                      : ""}
                  </div>
                  {th.canDelete && (
                    <button
                      onClick={(e) => handleDeleteThread(th.id, e)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Supprimer la discussion"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal création */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                Nouvelle discussion
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Donnez un titre clair (3 à 120 caractères).
              </p>
            </div>

            <form onSubmit={handleCreateThread} className="p-5">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Question sur le devoir 2"
                maxLength={120}
                autoFocus
              />

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setTitle("");
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50"
                  disabled={submitLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={submitLoading || title.trim().length < 3}
                >
                  {submitLoading ? "Création…" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
