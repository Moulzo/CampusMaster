"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { listCourseThreads, createCourseThread, deleteThread, Thread } from "@/lib/discussions";
import { getRoleLabel } from "@/lib/role-labels";

export function CourseDiscussionsTab({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");

  useEffect(() => {
    async function loadThreads() {
      try {
        setLoading(true);
        const data = await listCourseThreads(courseId);
        setThreads(data);
        setError("");
      } catch (e: any) {
        setError(e?.message ?? "Erreur chargement");
      } finally {
        setLoading(false);
      }
    }

    loadThreads();
  }, [courseId]);

  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault();
    if (!newThreadTitle.trim()) return;

    try {
      const newThread = await createCourseThread(courseId, newThreadTitle.trim());
      setThreads([newThread, ...threads]);
      setNewThreadTitle("");
      setShowNewThread(false);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de la discussion");
    }
  }

  async function handleDeleteThread(threadId: string, e: React.MouseEvent) {
    e.stopPropagation(); // Éviter de naviguer vers la discussion
    
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette discussion ?")) return;

    try {
      await deleteThread(threadId);
      setThreads(threads.filter(t => t.id !== threadId));
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression");
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des discussions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Erreur</h2>
          <p className="text-red-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Discussions</h2>
        <button
          onClick={() => setShowNewThread(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nouvelle discussion
        </button>
      </div>

      {showNewThread && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Nouvelle discussion</h3>
            <form onSubmit={handleCreateThread}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre
                </label>
                <input
                  type="text"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Entrez le titre de la discussion..."
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewThread(false);
                    setNewThreadTitle("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {threads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune discussion pour le moment. Soyez le premier à en créer une !
          </div>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => router.push(`/student/courses/${courseId}/discussions/${thread.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{thread.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>Par {thread.createdBy.fullName}</span>
                    <span>•</span>
                    <span>{getRoleLabel(thread.createdBy.role)}</span>
                    <span>•</span>
                    <span>{thread._count.messages} message{thread._count.messages > 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Créée le {new Date(thread.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">
                    {new Date(thread.updatedAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                  {thread.canDelete && (
                    <button
                      onClick={(e) => handleDeleteThread(thread.id, e)}
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
          ))
        )}
      </div>
    </div>
  );
}
