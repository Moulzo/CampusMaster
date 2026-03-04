"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetchJson } from "@/lib/auth";

type Student = {
  id: string;
  email: string;
  fullName?: string | null;
};

type Submission = {
  id: string;
  studentId: string;
  score: number | null; // important: ton endpoint parle de "score"
  feedback?: string | null;
  submittedAt?: string | null; // Ajout de la propriété manquante
  student?: { id: string; email: string; fullName?: string | null };
};

type Assignment = {
  id: string;
  title: string;
  maxScore?: number | null;
  submissions: Submission[];
};

type RowStatus = "NON_SOUMIS" | "EN_ATTENTE" | "CORRIGE";

function fullName(s: Student) {
  const n = (s.fullName ?? "").trim();
  return n.length ? n : "(Nom non renseigné)";
}

function statusOf(sub: Submission | null): RowStatus {
  if (!sub) return "NON_SOUMIS";
  if (sub.score === null || sub.score === undefined) return "EN_ATTENTE";
  return "CORRIGE";
}

function StatusBadge({ status }: { status: RowStatus }) {
  const common = "inline-flex items-center px-2 py-1 rounded text-xs";
  if (status === "NON_SOUMIS") return <span className={`${common} bg-zinc-100 text-zinc-700`}>Non soumis</span>;
  if (status === "EN_ATTENTE") return <span className={`${common} bg-blue-100 text-blue-700`}>En attente</span>;
  return <span className={`${common} bg-emerald-100 text-emerald-700`}>Corrigé</span>;
}

export function TeacherCourseGradesTab({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("__AVERAGES__");
  const AVERAGES_ID = "__AVERAGES__";

  // modal / form
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<{
    student: Student;
    assignment: Assignment;
    submission: Submission;
  } | null>(null);
  const [scoreInput, setScoreInput] = useState<string>("");
  const [feedbackInput, setFeedbackInput] = useState<string>("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [a, s] = await Promise.all([
        apiFetchJson<Assignment[]>(`/assignments?courseId=${courseId}`),
        apiFetchJson<Student[]>(`/teacher/subjects/${courseId}/students`),
      ]);

      setAssignments(a);
      setStudents(s);

      // Défaut: "Moyennes des étudiants"
      if (!selectedAssignmentId) {
        setSelectedAssignmentId(AVERAGES_ID);
      } else if (selectedAssignmentId !== AVERAGES_ID && !a.some((x) => x.id === selectedAssignmentId)) {
        // si le devoir sélectionné n'existe plus, revenir aux moyennes
        setSelectedAssignmentId(AVERAGES_ID);
      }
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du chargement des notes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!courseId) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const selectedAssignment = useMemo(
    () => assignments.find((x) => x.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId]
  );

  const rows = useMemo(() => {
    const isAvgMode = selectedAssignmentId === AVERAGES_ID;
    return students.map((st) => {
      if (isAvgMode) {
        return {
          student: st,
          submission: null as Submission | null,
          status: "CORRIGE" as RowStatus, // pas utilisé en mode moyenne
          displayName: (st.fullName ?? "").trim() || "(Nom non renseigné)",
        };
      }
      if (!selectedAssignment) {
        return {
          student: st,
          submission: null,
          status: "NON_SOUMIS" as RowStatus,
          displayName: (st.fullName ?? "").trim() || "(Nom non renseigné)",
        };
      }
      const sub = selectedAssignment.submissions?.find((x) => x.studentId === st.id) ?? null;
      const status = statusOf(sub);
      const displayName =
        (sub?.student?.fullName ?? "").trim() ||
        (st.fullName ?? "").trim() ||
        "(Nom non renseigné)";
      return { student: st, submission: sub, status, displayName };
    });
  }, [students, selectedAssignment, selectedAssignmentId]);

  const averagesByStudentId = useMemo(() => {
    // Aligné sur le dashboard étudiant: moyenne arithmétique des scores corrigés
    const map = new Map<string, { sum: number; count: number }>();
    for (const a of assignments) {
      for (const sub of a.submissions ?? []) {
        if (sub.score === null || sub.score === undefined) continue; // uniquement corrigés
        const cur = map.get(sub.studentId) ?? { sum: 0, count: 0 };
        cur.sum += Number(sub.score);
        cur.count += 1;
        map.set(sub.studentId, cur);
      }
    }
    return map;
  }, [assignments]);

  function formatAverage(studentId: string) {
    const v = averagesByStudentId.get(studentId);
    if (!v || v.count <= 0) return "—";
    const avg = v.sum / v.count;
    return `${avg.toFixed(1)}/20`;
  }

  function openGradeModal(student: Student, assignment: Assignment, submission: Submission) {
    setActive({ student, assignment, submission });
    setScoreInput(submission.score == null ? "" : String(submission.score));
    setFeedbackInput(submission.feedback ?? "");
    setOpen(true);
  }

  async function saveGrade() {
    if (!active) return;
    const v = scoreInput.trim();
    const score = v === "" ? null : Number(v);
    if (score !== null && Number.isNaN(score)) {
      setError("Score invalide");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await apiFetchJson(`/submissions/${active.submission.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          feedback: feedbackInput.trim() ? feedbackInput.trim() : undefined,
        }),
      });
      await refresh();
      setOpen(false);
      setActive(null);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'enregistrement de la note");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-zinc-600">Chargement…</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
          <strong>Erreur:</strong> {error}
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded">
          Aucun devoir sur ce cours.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold">Notes</div>
          <div className="text-sm text-zinc-600">Filtrer par devoir, puis noter les soumissions.</div>
        </div>

        <div className="w-full sm:w-[360px]">
          <select
            className="w-full border rounded px-3 py-2"
            value={selectedAssignmentId}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
          >
            <option value={AVERAGES_ID}>Moyennes des étudiants</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-zinc-50 border-b">
            <tr>
              <th className="text-left text-sm font-medium p-3">Nom</th>
              <th className="text-left text-sm font-medium p-3">Email</th>
              {selectedAssignmentId === AVERAGES_ID ? (
                <th className="text-left text-sm font-medium p-3">Moyenne</th>
              ) : (
                <>
                  <th className="text-left text-sm font-medium p-3">Statut</th>
                  <th className="text-left text-sm font-medium p-3">Note</th>
                  <th className="text-right text-sm font-medium p-3">Action</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isAvgMode = selectedAssignmentId === AVERAGES_ID;
              const max = selectedAssignment?.maxScore ?? null;
              const scoreText =
                r.submission?.score == null ? "—" : max == null ? String(r.submission.score) : `${r.submission.score}/${max}`;

              return (
                <tr key={r.student.id} className="border-b last:border-b-0">
                  <td className="p-3 text-sm">{r.displayName}</td>
                  <td className="p-3 text-sm">{r.student.email}</td>
                  {isAvgMode ? (
                    <td className="p-3 text-sm">{formatAverage(r.student.id)}</td>
                  ) : (
                    <>
                      <td className="p-3 text-sm">
                        <StatusBadge status={r.status} />
                        {r.submission?.submittedAt && (
                          <div className="text-xs text-zinc-500 mt-1">
                            Déposé le {new Date(r.submission.submittedAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-sm">{scoreText}</td>
                      <td className="p-3 text-sm text-right">
                        {r.status === "NON_SOUMIS" ? (
                          <span className="text-zinc-400">—</span>
                        ) : (
                          <button
                            className="px-3 py-1.5 border rounded hover:bg-zinc-50"
                            onClick={() => {
                              if (!selectedAssignment || !r.submission) return;
                              openGradeModal(r.student, selectedAssignment, r.submission);
                            }}
                          >
                            {r.status === "CORRIGE" ? "Modifier la note" : "Noter"}
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            {rows.length === 0 ? (
              <tr>
                <td className="p-3 text-sm text-zinc-600" colSpan={selectedAssignmentId === AVERAGES_ID ? 3 : 5}>
                  Aucun étudiant inscrit.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Modal simple (sans dépendance UI) */}
      {open && active ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-lg shadow-lg">
            <div className="p-4 border-b">
              <div className="font-semibold">Noter une soumission</div>
              <div className="text-sm text-zinc-600 mt-1">
                {fullName(active.student)} — {active.student.email}
              </div>
              <div className="text-sm text-zinc-600">
                Devoir : <span className="font-medium text-zinc-800">{active.assignment.title}</span>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">Score</div>
                <input
                  className="w-full border rounded px-3 py-2"
                  inputMode="decimal"
                  placeholder="Ex: 15"
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                />
                {active.assignment.maxScore != null ? (
                  <div className="text-xs text-zinc-500 mt-1">Score max : {active.assignment.maxScore}</div>
                ) : null}
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Feedback (optionnel)</div>
                <textarea
                  className="w-full border rounded px-3 py-2 min-h-[90px]"
                  placeholder="Commentaire / feedback…"
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded hover:bg-zinc-50"
                onClick={() => {
                  setOpen(false);
                  setActive(null);
                }}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                onClick={saveGrade}
                disabled={saving}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
