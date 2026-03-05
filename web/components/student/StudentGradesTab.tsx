"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Assignment, getAssignments } from "@/lib/assignments";

type Row = {
  id: string;
  title: string;
  dueDate: string | null;
  status: "CORRIGE" | "EN_ATTENTE" | "NON_SOUMIS";
  score: number | null;
  maxScore: number | null;
  submittedAt: string | null;
  correctedAt: string | null;
};

export default function StudentGradesTab({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const assignments = await getAssignments(courseId);

        const mapped: Row[] = (assignments as Assignment[]).map((a: any) => {
          const mySub = a.submissions?.find((s: any) => s.studentId === user.id);

          if (!mySub) {
            return {
              id: a.id,
              title: a.title,
              dueDate: a.dueDate ?? null,
              status: "NON_SOUMIS",
              score: null,
              maxScore: a.maxScore ?? null,
              submittedAt: null,
              correctedAt: null,
            };
          }

          const hasScore = mySub.score !== null && mySub.score !== undefined;

          return {
            id: a.id,
            title: a.title,
            dueDate: a.dueDate ?? null,
            status: hasScore ? "CORRIGE" : "EN_ATTENTE",
            score: hasScore ? Number(mySub.score) : null,
            maxScore: a.maxScore ?? null,
            submittedAt: mySub.submittedAt ?? null,
            correctedAt: mySub.correctedAt ?? null,
          };
        });

        // tri : dueDate asc (null à la fin)
        mapped.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        setRows(mapped);
      } catch (e: any) {
        setError(e?.message ?? "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, user?.id]);

  // ✅ Auto-scroll avec hash
  useEffect(() => {
    if (!window.location.hash) return;
    const el = document.querySelector(window.location.hash);
    if (!el) return;
    
    // Attendre que les données soient chargées
    setTimeout(() => {
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [rows.length]);

  const avg = useMemo(() => {
    const graded = rows.filter((r) => r.status === "CORRIGE" && r.score !== null);
    if (!graded.length) return null;
    const sum = graded.reduce((acc, r) => acc + (r.score ?? 0), 0);
    return sum / graded.length;
  }, [rows]);

  return (
    <div className="mt-6 space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Notes</h3>
            <p className="text-sm text-slate-500 mt-1">
              Moyenne calculée sur les devoirs corrigés.
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase font-semibold">Moyenne</p>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? "…" : avg === null ? "--" : avg.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left font-semibold px-6 py-3">Devoir</th>
                <th className="text-left font-semibold px-6 py-3">Statut</th>
                <th className="text-left font-semibold px-6 py-3">Note</th>
                <th className="text-left font-semibold px-6 py-3">Date limite</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-slate-500" colSpan={4}>
                    Chargement…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-slate-500" colSpan={4}>
                    Aucun devoir pour ce cours.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} id={`grade-${r.id}`} className="hover:bg-slate-50 border-b last:border-b-0">
                    <td className="px-6 py-4 font-semibold text-slate-900">{r.title}</td>
                    <td className="px-6 py-4">
                      <span
                        className={[
                          "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
                          r.status === "CORRIGE"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "EN_ATTENTE"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-slate-100 text-slate-700",
                        ].join(" ")}
                      >
                        {r.status === "CORRIGE"
                          ? "Corrigé"
                          : r.status === "EN_ATTENTE"
                          ? "En attente"
                          : "Non soumis"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {r.score === null ? "--" : `${r.score} / ${r.maxScore ?? "?"}`}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {r.dueDate
                        ? new Date(r.dueDate).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
