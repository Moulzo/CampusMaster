"use client";

import { useEffect, useMemo, useState } from "react";
import { RequireRole } from "@/lib/require-role";
import { getAssignments, type Assignment } from "@/lib/assignments";

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(2)}%`;
}

function formatAverage(value: number | null) {
  return value === null ? "—" : value.toFixed(2);
}

function getSubmittedStudentIds(assignment: Assignment) {
  return new Set(
    (assignment.submissions ?? [])
      .map((submission) => submission.studentId)
      .filter(Boolean),
  );
}

function getEligibleStudentCount(assignment: Assignment) {
  const moduleStudents =
    assignment.course?.students ??
    assignment.course?.learningModule?.students ??
    [];

  if (moduleStudents.length > 0) {
    return moduleStudents.length;
  }

  return getSubmittedStudentIds(assignment).size;
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

type CourseStats = {
  courseId: string;
  courseTitle: string;
  studentCount: number;
  assignmentCount: number;
  expectedSubmissions: number;
  submissionCount: number;
  deliveredUniqueCount: number;
  submissionRate: number | null;
  gradedCount: number;
  pendingCorrectionCount: number;
  averageGrade: number | null;
};

export default function TeacherAnalyticsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await getAssignments();

        if (!cancelled) {
          setAssignments(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Erreur lors du chargement des statistiques.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const analytics = useMemo(() => {
    const assignmentCount = assignments.length;
    const allSubmissions = assignments.flatMap((assignment) =>
      (assignment.submissions ?? []).map((submission) => ({
        ...submission,
        assignmentMaxScore: assignment.maxScore ?? 20,
      })),
    );

    const submissionCount = allSubmissions.length;
    const gradedSubmissions = allSubmissions.filter(
      (submission) => submission.score !== null && submission.score !== undefined,
    );

    const pendingCorrectionCount = allSubmissions.filter(
      (submission) => submission.score === null || submission.score === undefined,
    ).length;

    const totalScore = gradedSubmissions.reduce((sum, submission) => {
      const maxScore = submission.assignmentMaxScore || 20;
      return sum + ((submission.score ?? 0) / maxScore) * 20;
    }, 0);

    const averageGrade =
      gradedSubmissions.length > 0
        ? Number((totalScore / gradedSubmissions.length).toFixed(2))
        : null;

    const uniqueDeliveredKeys = new Set(
      allSubmissions.map((submission) => {
        return `${submission.assignmentId}:${submission.studentId}`;
      }),
    );

    const deliveredUniqueCount = uniqueDeliveredKeys.size;

    const expectedSubmissions = assignments.reduce((sum, assignment) => {
      return sum + getEligibleStudentCount(assignment);
    }, 0);

    const submissionRate =
      expectedSubmissions > 0
        ? Number(((deliveredUniqueCount / expectedSubmissions) * 100).toFixed(2))
        : null;

    return {
      assignmentCount,
      submissionCount,
      deliveredUniqueCount,
      gradedCount: gradedSubmissions.length,
      pendingCorrectionCount,
      averageGrade,
      expectedSubmissions,
      submissionRate,
    };
  }, [assignments]);

  const courseStats = useMemo<CourseStats[]>(() => {
    const map = new Map<string, CourseStats & { totalGrade: number }>();

    for (const assignment of assignments) {
      const courseId = assignment.course?.id ?? assignment.courseId ?? "unknown";
      const courseTitle = assignment.course?.title ?? "Cours inconnu";

      if (!map.has(courseId)) {
        map.set(courseId, {
          courseId,
          courseTitle,
          studentCount: 0,
          assignmentCount: 0,
          expectedSubmissions: 0,
          submissionCount: 0,
          deliveredUniqueCount: 0,
          submissionRate: null,
          gradedCount: 0,
          pendingCorrectionCount: 0,
          totalGrade: 0,
          averageGrade: null,
        });
      }

      const current = map.get(courseId)!;
      current.assignmentCount += 1;

      const studentCount = getEligibleStudentCount(assignment);
      current.studentCount = Math.max(current.studentCount, studentCount);
      current.expectedSubmissions += studentCount;

      const deliveredStudentsForAssignment = new Set<string>();

      for (const submission of assignment.submissions ?? []) {
        deliveredStudentsForAssignment.add(submission.studentId);
        current.submissionCount += 1;

        if (submission.score === null || submission.score === undefined) {
          current.pendingCorrectionCount += 1;
          continue;
        }

        const maxScore = assignment.maxScore ?? 20;
        current.gradedCount += 1;
        current.totalGrade += (submission.score / maxScore) * 20;
      }

      current.deliveredUniqueCount += deliveredStudentsForAssignment.size;
    }

    return Array.from(map.values())
      .map(({ totalGrade, ...stats }) => ({
        ...stats,
        submissionRate:
          stats.expectedSubmissions > 0
            ? Number(
                (
                  (stats.deliveredUniqueCount / stats.expectedSubmissions) *
                  100
                ).toFixed(2),
              )
            : null,
        averageGrade:
          stats.gradedCount > 0
            ? Number((totalGrade / stats.gradedCount).toFixed(2))
            : null,
      }))
      .sort((a, b) => a.courseTitle.localeCompare(b.courseTitle, "fr"));
  }, [assignments]);

  return (
    <RequireRole role="TEACHER">
      <div className="space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Statistiques pédagogiques
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Suivez les devoirs, les remises et les corrections de vos matières.
          </p>
        </header>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            Chargement des statistiques...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Devoirs"
                value={analytics.assignmentCount}
                icon="📝"
              />
              <StatCard
                title="Dépôts"
                value={analytics.submissionCount}
                icon="📥"
              />
              <StatCard
                title="Rendus uniques"
                value={analytics.deliveredUniqueCount}
                icon="✅"
              />
              <StatCard
                title="À corriger"
                value={analytics.pendingCorrectionCount}
                icon="🕒"
              />
              <StatCard
                title="Moyenne"
                value={formatAverage(analytics.averageGrade)}
                icon="📊"
              />
              <StatCard
                title="Rendus attendus"
                value={analytics.expectedSubmissions}
                icon="🎯"
              />
              <StatCard
                title="Taux de remise"
                value={formatPercent(analytics.submissionRate)}
                icon="📈"
              />
              <StatCard
                title="Corrigés"
                value={analytics.gradedCount}
                icon="✅"
              />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Détail par matière
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Vue synthétique des devoirs et corrections par cours.
                </p>
              </div>

              {courseStats.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">
                  Aucune donnée disponible pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Matière</th>
                        <th className="px-4 py-3 font-semibold">Devoirs</th>
                        <th className="px-4 py-3 font-semibold">Étudiants</th>
                        <th className="px-4 py-3 font-semibold">Attendus</th>
                        <th className="px-4 py-3 font-semibold">Rendus uniques</th>
                        <th className="px-4 py-3 font-semibold">Taux</th>
                        <th className="px-4 py-3 font-semibold">Soumissions</th>
                        <th className="px-4 py-3 font-semibold">Corrigés</th>
                        <th className="px-4 py-3 font-semibold">À corriger</th>
                        <th className="px-4 py-3 font-semibold">Moyenne</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseStats.map((course) => (
                        <tr key={course.courseId} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {course.courseTitle}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {course.assignmentCount}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {course.studentCount}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {course.expectedSubmissions}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {course.deliveredUniqueCount}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatPercent(course.submissionRate)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {course.submissionCount}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {course.gradedCount}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {course.pendingCorrectionCount}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatAverage(course.averageGrade)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </RequireRole>
  );
}
