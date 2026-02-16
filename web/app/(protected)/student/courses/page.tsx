"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Course, getCourses, enrollCourse, unenrollCourse } from "@/lib/courses";
import { logout } from "@/lib/auth";

export default function StudentCoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  async function loadCourses() {
    setError("");
    setLoading(true);
    try {
      const data = await getCourses();
      setAllCourses(data);

      const myEnrolled = data.filter((c) =>
        c.students.some((s) => s.id === user?.id)
      );
      setEnrolledCourses(myEnrolled);
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/student/courses");
      return;
    }
    if (user.role !== "STUDENT") {
      router.replace(`/login?next=/student/courses`);
      return;
    }

    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  async function handleEnroll(courseId: string) {
    setError("");
    try {
      await enrollCourse(courseId);
      await loadCourses(); // ✅ refresh clean
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    }
  }

  async function handleUnenroll(courseId: string) {
    if (!confirm("Êtes-vous sûr de vouloir vous désinscrire de ce cours ?")) return;

    setError("");
    try {
      await unenrollCourse(courseId);
      await loadCourses(); // ✅ refresh clean
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const availableCourses = allCourses.filter(
    (c) => !enrolledCourses.some((e) => e.id === c.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mes Cours</h1>
            <p className="text-sm text-slate-500 mt-1">Consulter et gérer vos inscriptions</p>
          </div>
          <button
            onClick={async () => {
              await logout();
              router.replace("/login");
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

        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Mes inscriptions ({enrolledCourses.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.length > 0 ? (
              enrolledCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-lg shadow-md border border-emerald-200 p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-900">{course.title}</h3>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                      Inscrit
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 mb-4 h-12 line-clamp-2">
                    {course.description || "Aucune description"}
                  </p>

                  <div className="mb-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>👨‍🏫</span> {course.teacher.fullName}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>👥</span> {course.students.length} étudiant{course.students.length !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/student/courses/${course.id}`)}
                      className="flex-1 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => handleUnenroll(course.id)}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition"
                    >
                      ✖️
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center">
                <p className="text-slate-600">Vous n'êtes inscrit à aucun cours pour le moment</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Cours disponibles ({availableCourses.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.length > 0 ? (
              availableCourses.map((course) => (
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
                      <span>👨‍🏫</span> {course.teacher.fullName}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>👥</span> {course.students.length} étudiant{course.students.length !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/student/courses/${course.id}`)}
                      className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => handleEnroll(course.id)}
                      className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition"
                    >
                      S'inscrire
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center">
                <p className="text-slate-600">Aucun autre cours disponible</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
