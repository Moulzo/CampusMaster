"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getSubjects,
  getLearningModules,
  setSubjectModule,
  unsetSubjectModule,
  Course,
  LearningModule,
} from "@/lib/admin-academics";
import { useToast } from "@/lib/toast";

export default function AdminSubjectsPage() {
  const toast = useToast();
  const [subjects, setSubjects] = useState<Course[]>([]);
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

const filteredSubjects = useMemo(() => {
  const needle = q.trim().toLowerCase();

  return subjects.filter((c) => {
    const matchesText =
      !needle ||
      c.title.toLowerCase().includes(needle) ||
      (c.teacher?.fullName?.toLowerCase().includes(needle) ?? false) ||
      (c.teacher?.email?.toLowerCase().includes(needle) ?? false);

    const matchesSemester =
      !semesterId ||
      (c.learningModule?.semester?.id === semesterId) ||
      // si non affecté: false
      false;

    const matchesModule =
      !moduleIdFilter || (c.learningModuleId ?? "") === moduleIdFilter;

    return matchesText && matchesSemester && matchesModule;
  });
}, [subjects, q, semesterId, moduleIdFilter]);

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const [subjectsData, modulesData] = await Promise.all([
        getSubjects(),
        getLearningModules(),
      ]);
      setSubjects(subjectsData);
      setModules(modulesData);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onSetModule(courseId: string, learningModuleId: string) {
    try {
      const updated = await setSubjectModule(courseId, learningModuleId);
      setSubjects((prev) => prev.map((x) => (x.id === courseId ? updated : x)));
      toast.push("success", "Matière affectée au module");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur affectation");
    }
  }

  async function onUnsetModule(courseId: string) {
    try {
      const updated = await unsetSubjectModule(courseId);
      setSubjects((prev) => prev.map((x) => (x.id === courseId ? updated : x)));
      toast.push("success", "Matière désaffectée du module");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur désaffectation");
    }
  }

  function getModuleInfo(course: Course) {
    const mod = course.learningModule;
    if (!mod) return "-";
    return mod.semester ? `${mod.semester.name} / ${mod.name}` : mod.name;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Matières (Courses)</h1>
        <p className="text-slate-600">Affecter les matières aux modules et semestres.</p>
      </div>

      {err && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">{err}</div>}

      <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Recherche</label>
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Matière, prof, email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Filtrer par semestre</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={semesterId}
            onChange={(e) => {
              setSemesterId(e.target.value);
              // si le module choisi n'appartient plus au semestre, on reset
              setModuleIdFilter("");
            }}
          >
            <option value="">Tous</option>
            {/* on déduit la liste des semestres depuis les modules */}
            {Array.from(
              new Map(
                modules
                  .filter((m) => m.semester)
                  .map((m) => [m.semester!.id, m.semester!.name] as const)
              )
            ).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">Filtrer par module</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={moduleIdFilter}
            onChange={(e) => setModuleIdFilter(e.target.value)}
          >
            <option value="">Tous</option>
            {moduleOptions
              .filter((m) => !semesterId || m.semesterId === semesterId || m.id === "")
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div>Chargement…</div>
      ) : filteredSubjects.length === 0 ? (
        <div className="text-slate-600">Aucune matière trouvée.</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Matière</th>
                <th className="text-left p-3">Professeur</th>
                <th className="text-left p-3">Semestre/Module actuel</th>
                <th className="text-left p-3">Affecter au module</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map((course) => (
                <tr key={course.id} className="border-t">
                  <td className="p-3 font-medium">{course.title}</td>
                  <td className="p-3">{course.teacher?.fullName ?? "-"}</td>
                  <td className="p-3">{getModuleInfo(course)}</td>
                  <td className="p-3">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={course.learningModuleId || ""}
                      onChange={async (e) => {
                        const moduleId = e.target.value;
                        if (moduleId) {
                          await onSetModule(course.id, moduleId);
                        } else {
                          await onUnsetModule(course.id);
                        }
                      }}
                    >
                      {moduleOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      {course.learningModuleId && (
                        <button
                          className="px-3 py-1 rounded bg-red-100 text-red-700"
                          onClick={() => onUnsetModule(course.id)}
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
