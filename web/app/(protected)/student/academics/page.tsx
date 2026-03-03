"use client";

import { useEffect, useState } from "react";
import { getAcademicsTree } from "@/lib/academics";
import Link from "next/link";

interface Subject {
  id: string;
  title: string;
  description?: string | null;
  teachers: { id: string; fullName: string; email: string }[];
}

interface Module {
  id: string;
  name: string;
  description?: string | null;
  subjects: Subject[];
}

interface Semester {
  id: string;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  learningModules: Module[];
}

export default function StudentAcademicsPage() {
  const [tree, setTree] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getAcademicsTree();
        setTree(data);
      } catch (e: any) {
        setErr(e?.message ?? "Erreur");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div>Chargement de l'arborescence académique...</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">{err}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cours et Matières</h1>
        <p className="text-slate-600">
          Explorez l'arborescence complète des cours par semestre et module.
        </p>
      </div>

      {tree.length === 0 ? (
        <div className="text-slate-600">Aucun cours disponible.</div>
      ) : (
        <div className="space-y-8">
          {tree.map((semester) => (
            <div key={semester.id} className="space-y-4">
              {/* Semestre Header */}
              <div className="bg-white border rounded-lg p-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {semester.name}
                </h2>
                {semester.startDate && semester.endDate && (
                  <p className="text-sm text-slate-600 mt-1">
                    {new Date(semester.startDate).toLocaleDateString()} -{" "}
                    {new Date(semester.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Modules */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {semester.learningModules.map((module) => (
                  <div
                    key={module.id}
                    className="bg-white border rounded-lg p-4 space-y-3"
                  >
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {module.name}
                      </h3>
                      {module.description && (
                        <p className="text-sm text-slate-600 mt-1">
                          {module.description}
                        </p>
                      )}
                    </div>

                    {/* Subjects */}
                    <div className="space-y-2">
                      {module.subjects.map((subject) => (
                        <div
                          key={subject.id}
                          className="bg-slate-50 border border-slate-200 rounded p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900">
                                {subject.title}
                              </h4>
                              {subject.description && (
                                <p className="text-sm text-slate-600 mt-1">
                                  {subject.description}
                                </p>
                              )}
                              {(() => {
                                const profs =
                                  (subject.teachers ?? [])
                                    .map((t) => (t.fullName && t.fullName.trim() ? t.fullName : t.email))
                                    .join(", ") || "—";
                                
                                return (
                                  <p className="text-xs text-slate-500 mt-2">
                                    Prof: {profs}
                                  </p>
                                );
                              })()}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Link
                                href={`/student/courses/${subject.id}`}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Voir la matière
                              </Link>
                              <Link
                                href={`/student/courses/${subject.id}?tab=assignments`}
                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Devoirs
                              </Link>
                              <Link
                                href={`/student/courses/${subject.id}?tab=resources`}
                                className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                              >
                                Supports
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
