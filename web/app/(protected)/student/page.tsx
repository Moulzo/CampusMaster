"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { getMySubjects, StudentSubject } from "@/lib/student-academics";
import { Assignment, getAssignments } from "@/lib/assignments";

export default function StudentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string>("");
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [assignmentsCount, setAssignmentsCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [nextAssignments, setNextAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);

  // Helper function pour afficher le module
  function moduleLabel(s: StudentSubject) {
    const mod = s.learningModule;
    if (!mod) return "-";
    return mod.semester ? `${mod.semester.name} / ${mod.name}` : mod.name;
  }

  // Helper function stricte : récupère SEULEMENT la soumission du user connecté
  function getMySubmission(a: any, userId?: string) {
    if (!userId) return null;
    return a?.submissions?.find((s: any) => s.studentId === userId);
  }

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    (async () => {
      setStatsLoading(true);
      setStatsError("");
      try {
        const subjects = await getMySubjects();
        setSubjects(subjects);
        setSubjectsCount(subjects.length);

        const courseIds = subjects.map((s) => s.id).filter(Boolean);

        // si aucun cours => tout à zéro
        if (!courseIds.length) {
          setAssignmentsCount(0);
          setPendingCount(0);
          setLateCount(0);
          setNextAssignments([]);
          setAvgScore(null);
          return;
        }

        const all = await Promise.all(courseIds.map((id) => getAssignments(id)));
        const flat = all.flat();

        const seen = new Set<string>();
        const myAssignments = flat.filter((a) =>
          seen.has(a.id) ? false : (seen.add(a.id), true)
        );

        setAssignmentsCount(myAssignments.length);

        // Debug: confirmer la cause des IDs
        if (myAssignments.length > 0 && myAssignments[0]?.submissions?.[0]) {
          console.log("user.id", user?.id, "sub.studentId", myAssignments[0]?.submissions?.[0]?.studentId, "sub.student.id", myAssignments[0]?.submissions?.[0]?.student?.id);
          console.log("getMySubmission result:", getMySubmission(myAssignments[0], user?.id));
        }

        // Patch 1 — Dashboard étudiant : comptage "à rendre / en retard / soumis" exclusif
        const now = Date.now();

        // ⚠️ Important: on détecte la soumission de l'étudiant via submissions[*].studentId
        const submitted = myAssignments.filter((a: Assignment) =>
          a.submissions?.some((s: any) => s.studentId === user.id)
        );

        const pending = myAssignments.filter((a: Assignment) =>
          !a.submissions?.some((s: any) => s.studentId === user.id)
        );

        const pendingLate = pending.filter((a: Assignment) =>
          a.dueDate ? new Date(a.dueDate).getTime() < now : false
        );

        const pendingFuture = pending.filter((a: Assignment) =>
          !a.dueDate ? true : new Date(a.dueDate).getTime() >= now
        );

        // totals
        setAssignmentsCount(myAssignments.length);

        // si tu as des states dédiés (recommandé)
        setPendingCount(pendingFuture.length);   // "à rendre"
        setLateCount(pendingLate.length);        // "en retard"
        setSubmittedCount(submitted.length);     // "soumis"

        // Patch 3 — "Prochains Devoirs" : ne proposer que les devoirs NON soumis
        const upcomingAssignments = myAssignments
          .filter((a: Assignment) => {
            const mySub = a.submissions?.find((s: any) => s.studentId === user.id);
            if (mySub) return false; // ✅ déjà soumis => pas "à faire"
            if (!a.dueDate) return true;
            return new Date(a.dueDate).getTime() >= now; // ✅ futurs uniquement
          })
          .sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          })
          .slice(0, 3);

        setNextAssignments(upcomingAssignments);

        const gradedScores: number[] = [];
        for (const a of myAssignments) {
          const mySub = a.submissions?.find((s: any) => s.studentId === user.id);
          if (mySub && mySub.score !== null && mySub.score !== undefined) {
            gradedScores.push(mySub.score);
          }
        }

        setAvgScore(
          gradedScores.length ? gradedScores.reduce((acc, s) => acc + s, 0) / gradedScores.length : null
        );
      } catch (e: any) {
        setStatsError(e?.message ?? "Erreur");
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [loading, user?.id]);

  const subjectsLabel = useMemo(() => (statsLoading ? "…" : String(subjectsCount)), [statsLoading, subjectsCount]);
  // 1) Garde assignmentsLabel simple
  const assignmentsLabel = useMemo(() => {
    if (statsLoading) return "...";
    return String(assignmentsCount);
  }, [statsLoading, assignmentsCount]);
  const avgLabel = useMemo(() => {
    if (statsLoading) return "…";
    if (avgScore === null) return "--";
    return avgScore.toFixed(1);
  }, [statsLoading, avgScore]);

  if (loading) return <p className="p-6">Chargement...</p>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Espace Étudiant</h1>
            <p className="text-sm text-slate-500 mt-1">Consultez vos cours et devoirs</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full mx-auto flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {user?.fullName?.charAt(0)?.toUpperCase() || "E"}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-4">{user?.fullName}</h2>
                <p className="text-sm text-emerald-600 font-medium mt-1">Étudiant</p>
              </div>
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Email</p>
                  <p className="text-sm text-slate-900 truncate">{user?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">ID</p>
                  <p className="text-xs text-slate-600 font-mono">{user?.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            {statsError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">{statsError}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Mes Matières</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{subjectsLabel}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg sm:text-xl">📚</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-slate-200">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-slate-500">Devoirs</p>

      <div className="mt-1">
  <p className="text-2xl sm:text-3xl font-bold text-slate-900">
    {assignmentsLabel}
  </p>

  {!statsLoading && (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
        {pendingCount} à faire
      </span>

      {lateCount > 0 && (
        <span className="inline-flex items-center whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          {lateCount} en retard
        </span>
      )}

      {submittedCount > 0 && (
        <span className="inline-flex items-center whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          {submittedCount} soumis
        </span>
      )}
    </div>
  )}
</div>
    </div>

    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
      <span className="text-lg sm:text-xl">📋</span>
    </div>
  </div>
</div>
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Moyenne</p>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{avgLabel}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg sm:text-xl">📊</span>
                  </div>
                </div>
              </div>
            </div>

            {/* My Subjects Section */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Mes Matières</h3>
              <div className="space-y-3">
                {subjects.length > 0 ? (
                  subjects.map((subject) => (
                    <div key={subject.id} className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer" onClick={() => router.push(`/student/courses/${subject.id}`)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{subject.title}</p>
                          <p className="text-sm text-slate-500">{moduleLabel(subject)}</p>
                        </div>
                        <span className="text-2xl">📚</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mt-4 p-4 border-2 border-dashed border-slate-300 rounded-lg text-center text-slate-500">
                    <p className="text-sm">Aucune matière pour le moment</p>
                  </div>
                )}
              </div>
            </div>

            {/* Next Assignments */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Prochains Devoirs</h3>
              <div className="space-y-3">
                {nextAssignments.length > 0 ? (
                  nextAssignments.map((assignment) => (
                    <div key={assignment.id} className="p-4 border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition cursor-pointer" onClick={() => router.push(`/student/assignments?courseId=${assignment.courseId}`)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{assignment.title}</p>
                          <p className="text-sm text-slate-500">
                            {assignment.dueDate 
                              ? `À rendre avant le ${new Date(assignment.dueDate).toLocaleString("fr-FR", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`
                              : 'Pas de date limite'
                            }
                          </p>
                        </div>
                        <span
                          className={[
                            "px-3 py-1 text-xs font-semibold rounded-full",
                            (() => {
                              const mySub = assignment.submissions?.find((s: any) => s.studentId === user.id);
                              const isSubmitted = !!mySub;
                              const isLate = !isSubmitted && assignment.dueDate && new Date(assignment.dueDate) < new Date();
                              return isLate ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800";
                            })()
                          ].join(" ")}
                        >
                          {(() => {
                            const mySub = assignment.submissions?.find((s: any) => s.studentId === user.id);
                            const isSubmitted = !!mySub;
                            const isLate = !isSubmitted && assignment.dueDate && new Date(assignment.dueDate) < new Date();
                            return isLate ? "En retard" : "À faire";
                          })()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mt-4 p-4 border-2 border-dashed border-slate-300 rounded-lg text-center text-slate-500">
                    <p className="text-sm">Aucun devoir à venir</p>
                  </div>
                )}
              </div>
            </div>

            {/* Debug Info */}
            <details className="bg-slate-900 rounded-lg p-4 text-slate-400 text-xs font-mono">
              <summary className="cursor-pointer font-bold text-slate-300 mb-3">Données Utilisateur</summary>
              <pre className="overflow-x-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </main>
    </div>
  );
}
