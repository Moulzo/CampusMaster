"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMySubjects, StudentSubject } from "@/lib/student-academics";
import { useToast } from "@/lib/toast";

export default function StudentSubjectsPage() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<StudentSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const data = await getMySubjects();
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function moduleLabel(s: StudentSubject) {
    const mod = s.learningModule;
    if (!mod) return "-";
    return mod.semester ? `${mod.semester.name} / ${mod.name}` : mod.name;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes matières</h1>
        <p className="text-slate-600">Liste des matières de ton module.</p>
      </div>

      {err && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div>Chargement…</div>
      ) : items.length === 0 ? (
        <div className="text-slate-600">
          Aucune matière pour ton module (ou aucun module assigné).
        </div>
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
              {items.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">
                    <button
                      onClick={() => router.push(`/student/courses/${s.id}`)}
                      className="text-left font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      {s.title}
                    </button>
                  </td>
                  <td className="p-3">{moduleLabel(s)}</td>
                  <td className="p-3">
                    {(() => {
                      const list = s.teachers ?? [];
                      return list.length === 0 ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        <div className="space-y-1">
                          {list.map((t) => (
                            <div key={t.id}>{t.fullName || t.email}</div>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
