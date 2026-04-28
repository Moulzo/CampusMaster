"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequireRole } from "@/lib/require-role";
import {
  getAdminAnalyticsCourses,
  getAdminAnalyticsOverview,
  type AdminAnalyticsOverview,
  type AdminCourseAnalytics,
} from "@/lib/admin-analytics";

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(2)}%`;
}

function formatAverage(value: number | null) {
  return value === null ? "—" : value.toFixed(2);
}

function getRateBadgeClass(value: number | null) {
  if (value === null) return "bg-slate-100 text-slate-500";
  if (value >= 80) return "bg-green-100 text-green-700";
  if (value >= 50) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function getAverageBadgeClass(value: number | null) {
  if (value === null) return "bg-slate-100 text-slate-500";
  if (value >= 14) return "bg-green-100 text-green-700";
  if (value >= 10) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function StatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: string;
  tone: "blue" | "green" | "purple" | "orange" | "pink" | "slate";
}) {
  const tones = {
    blue: "bg-blue-100",
    green: "bg-green-100",
    purple: "bg-purple-100",
    orange: "bg-orange-100",
    pink: "bg-pink-100",
    slate: "bg-slate-100",
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 ${tones[tone]} rounded-lg flex items-center justify-center`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null);
  const [courses, setCourses] = useState<AdminCourseAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [overviewData, coursesData] = await Promise.all([
          getAdminAnalyticsOverview(),
          getAdminAnalyticsCourses(),
        ]);

        if (cancelled) return;

        setOverview(overviewData);
        setCourses(coursesData);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Erreur lors du chargement des analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);


  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const aRate = a.submissionRate ?? -1;
      const bRate = b.submissionRate ?? -1;
      if (bRate !== aRate) return bRate - aRate;
      return a.courseTitle.localeCompare(b.courseTitle, "fr");
    });
  }, [courses]);

  const bestSubmissionCourse = useMemo(() => {
    const valid = courses.filter((c) => c.submissionRate !== null);
    if (!valid.length) return null;
    return [...valid].sort((a, b) => (b.submissionRate ?? 0) - (a.submissionRate ?? 0))[0];
  }, [courses]);

  const lowestSubmissionCourse = useMemo(() => {
    const valid = courses.filter((c) => c.submissionRate !== null);
    if (!valid.length) return null;
    return [...valid].sort((a, b) => (a.submissionRate ?? 0) - (b.submissionRate ?? 0))[0];
  }, [courses]);

  const bestAverageCourse = useMemo(() => {
    const valid = courses.filter((c) => c.averageGrade !== null);
    if (!valid.length) return null;
    return [...valid].sort((a, b) => (b.averageGrade ?? 0) - (a.averageGrade ?? 0))[0];
  }, [courses]);

  return (
    <RequireRole role="ADMIN">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Panneau Administrateur</h1>
              <p className="text-sm text-slate-500 mt-1">
                Gérez le système et consultez les indicateurs clés
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">A</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-4">Admin</h2>
                  <p className="text-sm text-purple-600 font-medium mt-1">Administrateur</p>
                </div>
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Email</p>
                    <p className="text-sm text-slate-900 truncate">admin@campusmaster.com</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">ID</p>
                    <p className="text-xs text-slate-600 font-mono">admin-001</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Outils d'Administration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  <Link
                    href="/admin/users"
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <span>👥</span> Gérer Utilisateurs
                  </Link>
                  <Link
                    href="/admin/semesters"
                    className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <span>📅</span> Semestres
                  </Link>
                  <Link
                    href="/admin/modules"
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <span>📚</span> Modules
                  </Link>
                  <Link
                    href="/admin/subjects"
                    className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <span>📖</span> Matières
                  </Link>
                  <Link
                    href="/admin/analytics"
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <span>📈</span> Statistiques
                  </Link>
                </div>
              </div>

              {!loading && !error && (
                <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Points clés</h3>
                  <div className="space-y-3 text-sm">
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                      <p className="font-semibold text-green-800">Meilleur taux de remise</p>
                      <p className="text-green-700">
                        {bestSubmissionCourse
                          ? `${bestSubmissionCourse.courseTitle} — ${formatPercent(
                              bestSubmissionCourse.submissionRate,
                            )}`
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                      <p className="font-semibold text-amber-800">Taux le plus faible</p>
                      <p className="text-amber-700">
                        {lowestSubmissionCourse
                          ? `${lowestSubmissionCourse.courseTitle} — ${formatPercent(
                              lowestSubmissionCourse.submissionRate,
                            )}`
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                      <p className="font-semibold text-blue-800">Meilleure moyenne</p>
                      <p className="text-blue-700">
                        {bestAverageCourse
                          ? `${bestAverageCourse.courseTitle} — ${formatAverage(
                              bestAverageCourse.averageGrade,
                            )}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              {loading ? (
                <div className="bg-white rounded-lg shadow-md p-8 border border-slate-200 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-slate-600">Chargement des analytics...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h2 className="text-red-800 font-semibold">Erreur</h2>
                  <p className="text-red-600 mt-2">{error}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <StatCard title="Utilisateurs" value={overview?.totals.users ?? 0} icon="👥" tone="blue" />
                    <StatCard title="Étudiants" value={overview?.totals.students ?? 0} icon="🎓" tone="green" />
                    <StatCard title="Enseignants" value={overview?.totals.teachers ?? 0} icon="🧑‍🏫" tone="purple" />
                    <StatCard title="Admins" value={overview?.totals.admins ?? 0} icon="🛡️" tone="slate" />
                    <StatCard title="Cours" value={overview?.totals.courses ?? 0} icon="📚" tone="orange" />
                    <StatCard title="Ressources" value={overview?.totals.resources ?? 0} icon="📎" tone="orange" />
                    <StatCard title="Consultations" value={overview?.totals.resourceViews ?? 0} icon="👁️" tone="blue" />
                    <StatCard title="Téléchargements" value={overview?.totals.resourceDownloads ?? 0} icon="⬇️" tone="green" />
                    <StatCard title="Devoirs" value={overview?.totals.assignments ?? 0} icon="📝" tone="pink" />
                    <StatCard
                      title="Taux de remise"
                      value={formatPercent(overview?.kpis.submissionRate ?? null)}
                      icon="📈"
                      tone="slate"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                      <p className="text-sm text-slate-500">Moyenne globale</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">
                        {formatAverage(overview?.kpis.globalAverage ?? null)}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                      <p className="text-sm text-slate-500">Rendus uniques</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">
                        {overview?.kpis.deliveredAssignments ?? 0}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                      <p className="text-sm text-slate-500">Rendus attendus</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">
                        {overview?.kpis.expectedSubmissions ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                      <h3 className="text-lg font-bold text-slate-900">Performance par matière</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Vue d'ensemble des remises et des moyennes par cours
                      </p>
                    </div>

                    {sortedCourses.length === 0 ? (
                      <div className="p-6 text-slate-500">Aucune donnée analytics disponible.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr className="text-left text-slate-600">
                              <th className="px-4 py-3 font-semibold">Matière</th>
                              <th className="px-4 py-3 font-semibold">Module</th>
                              <th className="px-4 py-3 font-semibold">Semestre</th>
                              <th className="px-4 py-3 font-semibold">Étudiants</th>
                              <th className="px-4 py-3 font-semibold">Devoirs</th>
                              <th className="px-4 py-3 font-semibold">Rendus</th>
                              <th className="px-4 py-3 font-semibold">Attendus</th>
                              <th className="px-4 py-3 font-semibold">Taux</th>
                              <th className="px-4 py-3 font-semibold">Moyenne</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedCourses.map((course) => (
                              <tr key={course.courseId} className="border-t border-slate-100">
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  {course.courseTitle}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {course.learningModuleName ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                  {course.semesterName ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-slate-600">{course.studentCount}</td>
                                <td className="px-4 py-3 text-slate-600">{course.assignmentCount}</td>
                                <td className="px-4 py-3 text-slate-600">
                                  {course.deliveredAssignmentCount}
                                  <span className="text-xs text-slate-400 ml-1">
                                    ({course.submissionCount} dépôts)
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{course.expectedSubmissions}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getRateBadgeClass(
                                      course.submissionRate,
                                    )}`}
                                  >
                                    {formatPercent(course.submissionRate)}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getAverageBadgeClass(
                                      course.averageGrade,
                                    )}`}
                                  >
                                    {formatAverage(course.averageGrade)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </RequireRole>
  );
}
