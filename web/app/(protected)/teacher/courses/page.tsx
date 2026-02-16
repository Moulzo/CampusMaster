"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Course, getCourses, createCourse, deleteCourse } from "@/lib/courses";
import { logout } from "@/lib/auth";

export default function TeacherCoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(`/login?next=/teacher/courses`);
      return;
    }

    if (user.role !== "TEACHER") {
      router.replace(`/forbidden`);
      return;
    }

    (async () => {
      try {
        const data = await getCourses();
        const myCourses = data.filter((c) => c.teacherId === user.id);
        setCourses(myCourses);
      } catch (err: any) {
        setError(err.message ?? "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router]);

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setFormLoading(true);
    setError("");
    try {
      const newCourse = await createCourse(title, description);
      setCourses((prev) => [...prev, newCourse]);
      setTitle("");
      setDescription("");
      setShowForm(false);
    } catch (err: any) {
      setError(err.message ?? "Erreur");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteCourse(courseId: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce cours ?")) return;

    try {
      await deleteCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err: any) {
      setError(err.message ?? "Erreur");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mes Cours</h1>
            <p className="text-sm text-slate-500 mt-1">Gestion des cours que vous enseignez</p>
          </div>

          <button
            onClick={async () => {
              await logout();
              router.replace("/login");
              router.refresh();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
          >
            Se déconnecter
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {showForm && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Créer un nouveau cours</h2>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Titre du cours</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="Ex: Mathématiques Appliquées"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description (optionnel)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="Décrivez votre cours..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition"
                >
                  {formLoading ? "Création..." : "Créer le cours"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg font-medium transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
          >
            <span>➕</span> Créer un cours
          </button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.length > 0 ? (
            courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow-md border border-slate-200 p-6 hover:shadow-lg transition"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-2">{course.title}</h3>
                <p className="text-sm text-slate-600 mb-4 h-12 line-clamp-2">
                  {course.description || "Aucune description"}
                </p>

                <div className="mb-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span>👥</span> {course.students.length} étudiant{course.students.length !== 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span>📚</span> ID: {course.id.slice(0, 8)}...
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/teacher/courses/${course.id}`)}
                    className="flex-1 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition"
                  >
                    Voir
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-8 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center">
              <p className="text-slate-600 mb-4">Vous n&apos;avez pas encore créé de cours</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Créer mon premier cours
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
