"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getMySubjects, StudentSubject } from "@/lib/student-academics";
import { getAssignments, Assignment } from "@/lib/assignments";

type CourseGradesSummary = {
  courseId: string;
  courseTitle: string;
  moduleLabel: string;
  avg: number | null;
  gradedCount: number;
  totalCount: number;
  pendingCorrectionCount: number; // soumis mais pas corrigé
  missingCount: number; // non soumis
};

function moduleLabel(s: StudentSubject) {
  const mod = s.learningModule;
  if (!mod) return "-";
  return mod.semester ? `${mod.semester.name} / ${mod.name}` : mod.name;
}

export default function StudentGradesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [rows, setRows] = useState<CourseGradesSummary[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    (async () => {
      setPageLoading(true);
      setError("");

      try {
        const subs = await getMySubjects();
        setSubjects(subs);

        const courseIds = subs.map((s) => s.id).filter(Boolean);
        if (!courseIds.length) {
          setRows([]);
          return;
        }

        const all = await Promise.all(courseIds.map((id) => getAssignments(id)));
        const summaries: CourseGradesSummary[] = all.map((assignments, idx) => {
          const subject = subs[idx];
          const totalCount = assignments.length;

          let gradedCount = 0;
          let sum = 0;

          let pendingCorrectionCount = 0;
          let missingCount = 0;

          for (const a of assignments as Assignment[]) {
            const mySub = a.submissions?.find((s: any) => s.studentId === user.id);

            if (!mySub) {
              missingCount += 1;
              continue;
            }

            const hasScore = mySub.score !== null && mySub.score !== undefined;
            if (hasScore) {
              gradedCount += 1;
              sum += Number(mySub.score);
            } else {
              pendingCorrectionCount += 1; // soumis mais pas noté
            }
          }

          const avg = gradedCount > 0 ? sum / gradedCount : null;

          return {
            courseId: subject.id,
            courseTitle: subject.title,
            moduleLabel: moduleLabel(subject),
            avg,
            gradedCount,
            totalCount,
            pendingCorrectionCount,
            missingCount,
          };
        });

        // tri : moyenne la plus basse d'abord (optionnel), sinon par titre
        summaries.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));
        setRows(summaries);
      } catch (e: any) {
        setError(e?.message ?? "Erreur");
      } finally {
        setPageLoading(false);
      }
    })();
  }, [loading, user?.id]);

  const globalAvg = useMemo(() => {
    const vals = rows.map((r) => r.avg).filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return vals.reduce((acc, v) => acc + v, 0) / vals.length;
  }, [rows]);

  if (loading) return <p className="p-6">Chargement...</p>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Notes</h1>
              <p className="text-sm text-slate-500 mt-1">
                Vue globale par matière
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-semibold">Moyenne globale</p>
              <p className="text-2xl font-bold text-slate-900">
                {pageLoading ? "…" : globalAvg === null ? "--" : globalAvg.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Mes matières</h2>
            <p className="text-sm text-slate-500 mt-1">
              Cliquez sur une matière pour voir le détail des notes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-semibold px-6 py-3">Matière</th>
                  <th className="text-left font-semibold px-6 py-3">Module</th>
                  <th className="text-left font-semibold px-6 py-3">Moyenne</th>
                  <th className="text-left font-semibold px-6 py-3">Corrigés</th>
                  <th className="text-left font-semibold px-6 py-3">En attente</th>
                  <th className="text-left font-semibold px-6 py-3">Non soumis</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {pageLoading ? (
                  <tr>
                    <td className="px-6 py-4 text-slate-500" colSpan={6}>
                      Chargement…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-slate-500" colSpan={6}>
                      Aucune matière / aucun devoir pour le moment.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.courseId}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => router.push(`/student/courses/${r.courseId}?tab=grades`)}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {r.courseTitle}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{r.moduleLabel}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">
                          {r.avg === null ? "--" : r.avg.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {r.gradedCount} / {r.totalCount}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{r.pendingCorrectionCount}</td>
                      <td className="px-6 py-4 text-slate-600">{r.missingCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
