"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast";
import { getTeacherSubjects } from "@/lib/teacher-academics";

type UserLite = { id: string; email: string; fullName: string };
type SemesterLite = { id: string; name: string };
type LearningModuleLite = { id: string; name: string; semester?: SemesterLite | null };
type Course = {
  id: string;
  title: string;
  description?: string | null;
  learningModule?: LearningModuleLite | null;
  teachers?: UserLite[];
};

export default function TeacherSubjectsPage() {
  const router = useRouter();
  const toast = useToast();
  const [subjects, setSubjects] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const data = await getTeacherSubjects();
      setSubjects(data);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return subjects;
    return subjects.filter((s) => {
      const teachers = (s.teachers ?? []).map((t) => `${t.fullName} ${t.email}`.toLowerCase()).join(" ");
      const mod = s.learningModule?.name?.toLowerCase() ?? "";
      const sem = s.learningModule?.semester?.name?.toLowerCase() ?? "";
      return (
        s.title.toLowerCase().includes(needle) ||
        (s.description ?? "").toLowerCase().includes(needle) ||
        teachers.includes(needle) ||
        mod.includes(needle) ||
        sem.includes(needle)
      );
    });
  }, [subjects, q]);

  function moduleLabel(s: Course) {
    const mod = s.learningModule;
    if (!mod) return "-";
    return mod.semester ? `${mod.semester.name} / ${mod.name}` : mod.name;
  }

  function teachersLabel(s: Course) {
    const list = s.teachers ?? [];
    if (list.length === 0) return "-";
    return list.map((t) => t.fullName || t.email).join(", ");
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes matières</h1>
        <p className="text-slate-600">Liste des matières où tu es professeur.</p>
      </div>

      {err && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">{err}</div>}

      <div className="bg-white border rounded-lg p-4">
        <label className="block text-sm text-slate-600 mb-1">Recherche</label>
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Matière, module, semestre, prof..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-600">Aucune matière trouvée.</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Matière</th>
                <th className="text-left p-3">Module</th>
                <th className="text-left p-3">Professeurs</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">
                    <button
                      onClick={() => router.push(`/teacher/courses/${s.id}`)}
                      className="text-left font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      {s.title}
                    </button>
                  </td>
                  <td className="p-3">{moduleLabel(s)}</td>
                  <td className="p-3">{teachersLabel(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
