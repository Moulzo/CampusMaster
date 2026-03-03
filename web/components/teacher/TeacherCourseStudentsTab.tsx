"use client";

import { useEffect, useState } from "react";
import { getTeacherSubjectStudents, TeacherCourseStudent } from "@/lib/teacher-academics";

export function TeacherCourseStudentsTab({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<TeacherCourseStudent[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getTeacherSubjectStudents(courseId);
        setStudents(data);
      } catch (e: any) {
        setError(e?.message ?? "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  if (loading) return <p className="text-sm text-slate-500">Chargement…</p>;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Étudiants inscrits</h3>
          <p className="text-sm text-slate-500">
            {students.length} étudiant{students.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {students.length === 0 ? (
        <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center text-slate-500">
          <p className="text-sm">Aucun étudiant trouvé pour ce cours</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr className="border-b">
                <th className="text-left py-2">Nom</th>
                <th className="text-left py-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b last:border-b-0">
                  <td className="py-3 font-medium text-slate-900">{s.fullName}</td>
                  <td className="py-3 text-slate-700">{s.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
