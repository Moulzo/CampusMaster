"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getStudents,
  getLearningModules,
  setStudentModule,
  unsetStudentModule,
  Student,
  LearningModule,
} from "@/lib/admin-academics";
import { useToast } from "@/lib/toast";

export default function AdminStudentsPage() {
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [semesterId, setSemesterId] = useState<string>("");
  const [moduleIdFilter, setModuleIdFilter] = useState<string>("");

  const moduleOptions = useMemo(() => {
    const opts = modules.map((m) => ({
      id: m.id,
      label: m.semester ? `${m.semester.name} / ${m.name}` : m.name,
      semesterId: m.semesterId,
    }));

    // tri sympa
    opts.sort((a, b) => a.label.localeCompare(b.label));

    return [{ id: "", label: "Aucun module", semesterId: "" }, ...opts];
  }, [modules]);

  const filteredStudents = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return students.filter((s) => {
      // Recherche textuelle
      const matchesText =
        !needle ||
        s.fullName.toLowerCase().includes(needle) ||
        s.email.toLowerCase().includes(needle);

      // Filtre semestre
      const matchesSemester =
        !semesterId ||
        (s.learningModule?.semester?.id === semesterId) ||
        false;

      // Filtre module
      const matchesModule =
        !moduleIdFilter || (s.learningModuleId ?? "") === moduleIdFilter;

      return matchesText && matchesSemester && matchesModule;
    });
  }, [students, q, semesterId, moduleIdFilter]);

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const [studentsData, modulesData] = await Promise.all([
        getStudents({ moduleId: moduleIdFilter, q }),
        getLearningModules(),
      ]);
      setStudents(studentsData);
      setModules(modulesData);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function onSetModule(studentId: string, learningModuleId: string) {
    try {
      const updated = await setStudentModule(studentId, learningModuleId);
      setStudents((prev) => prev.map((x) => (x.id === studentId ? updated : x)));
      toast.push("success", "Étudiant affecté au module");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur");
    }
  }

  async function onUnsetModule(studentId: string) {
    try {
      const updated = await unsetStudentModule(studentId);
      setStudents((prev) => prev.map((x) => (x.id === studentId ? updated : x)));
      toast.push("success", "Étudiant désaffecté du module");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur");
    }
  }

  function getModuleInfo(student: Student) {
    const mod = student.learningModule;
    if (!mod) return "-";
    return mod.semester ? `${mod.semester.name} / ${mod.name}` : mod.name;
  }

  useEffect(() => {
    refresh();
  }, [moduleIdFilter, q]);

  useEffect(() => {
    refresh();
  }, []);

  const uniqueSemesters = Array.from(new Set(modules.map(m => m.semester?.id).filter(Boolean)));
  const semesterOptions = uniqueSemesters.map((semesterId) => {
    const semester = modules.find(m => m.semester?.id === semesterId);
    return (
      <option key={semesterId} value={semesterId}>
        {semester?.name}
      </option>
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Étudiants</h1>
      </div>

      {/* Filtres */}
      <div className="bg-white border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Rechercher un étudiant..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
          
          <select
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Tous les semestres</option>
            {semesterOptions}
          </select>

          <select
            value={moduleIdFilter}
            onChange={(e) => setModuleIdFilter(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Tous les modules</option>
            {modules
              .filter(m => !semesterId || m.semesterId === semesterId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.semester ? `${m.semester.name} / ${m.name}` : m.name}
                </option>
              ))}
          </select>

          <div className="flex items-center">
            {loading && <span className="text-sm text-slate-600">Chargement...</span>}
            {err && <span className="text-sm text-red-600">{err}</span>}
          </div>
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <div>Chargement…</div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-slate-600">Aucun étudiant trouvé.</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Étudiant</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Module actuel</th>
                <th className="text-left p-3">Affecter à un module</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="border-t">
                  <td className="p-3 font-medium">{student.fullName}</td>
                  <td className="p-3">{student.email}</td>
                  <td className="p-3">{getModuleInfo(student)}</td>
                  <td className="p-3">
                    <select
                      className="border rounded px-2 py-1 text-sm w-full"
                      value={student.learningModuleId || ""}
                      onChange={async (e) => {
                        const moduleId = e.target.value;
                        if (moduleId) {
                          await onSetModule(student.id, moduleId);
                        } else {
                          await onUnsetModule(student.id);
                        }
                      }}
                    >
                      <option value="">Aucun module</option>
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.semester ? `${m.semester.name} / ${m.name}` : m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      {student.learningModuleId && (
                        <button
                          className="px-3 py-1 rounded bg-red-100 text-red-700"
                          onClick={() => onUnsetModule(student.id)}
                        >
                          Désaffecter
                        </button>
                      )}
                    </div>
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
