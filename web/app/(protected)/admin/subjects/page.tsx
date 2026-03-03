"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  getSubjects,
  getLearningModules,
  setSubjectModule,
  unsetSubjectModule,
  setSubjectTeachers,
  removeSubjectTeacher,
  getTeachers,
  Subject,
  LearningModule,
  createSubject,
} from "@/lib/admin-academics";
import { useToast } from "@/lib/toast";

export default function AdminSubjectsPage() {
  const toast = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; email: string; fullName?: string | null; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [semesterId, setSemesterId] = useState<string>("");
  const [moduleIdFilter, setModuleIdFilter] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Subject | null>(null);
  const [editTeacherIds, setEditTeacherIds] = useState<string[]>([]);

  // États pour le formulaire de création
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createModuleId, setCreateModuleId] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Cache flags pour éviter de re-fetch modules/teachers
  const didLoadModules = useRef(false);
  const didLoadTeachers = useRef(false);

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

    return subjects.filter((s) => {
      // Recherche textuelle
      const matchesText =
        !needle ||
        s.title.toLowerCase().includes(needle) ||
        s.description?.toLowerCase().includes(needle);

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
  }, [subjects, q, semesterId, moduleIdFilter]);

  async function refresh() {
    setLoading(true);
    setErr("");

    try {
      const subjectsPromise = getSubjects({ moduleId: moduleIdFilter });

      const modulesPromise = didLoadModules.current
        ? Promise.resolve(modules)
        : getLearningModules();

      const teachersPromise = didLoadTeachers.current
        ? Promise.resolve(teachers)
        : getTeachers();

      const [subjectsData, modulesData, teachersData] = await Promise.all([
        subjectsPromise,
        modulesPromise,
        teachersPromise,
      ]);

      setSubjects(subjectsData);

      if (!didLoadModules.current) {
        setModules(modulesData);
        didLoadModules.current = true;
      }

      if (!didLoadTeachers.current) {
        setTeachers(teachersData);
        didLoadTeachers.current = true;
      }
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [moduleIdFilter]);

  const uniqueSemesters = Array.from(new Set(modules.map(m => m.semester?.id).filter(Boolean)));
  const semesterOptions = uniqueSemesters.map((semesterId) => {
    const semester = modules.find(m => m.semester?.id === semesterId);
    return (
      <option key={semesterId} value={semesterId}>
        {semester?.name}
      </option>
    );
  });

  async function onSetModule(subjectId: string, learningModuleId: string) {
    try {
      const updated = await setSubjectModule(subjectId, learningModuleId);
      setSubjects((prev) => prev.map((x) => (x.id === subjectId ? updated : x)));
      toast.push("success", "Matière affectée au module");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur affectation");
    }
  }

  async function onUnsetModule(subjectId: string) {
    try {
      const updated = await unsetSubjectModule(subjectId);
      setSubjects((prev) => prev.map((x) => (x.id === subjectId ? updated : x)));
      toast.push("success", "Matière désaffectée du module");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur désaffectation");
    }
  }

  async function onRemoveTeacher(subjectId: string, userId: string) {
    try {
      const updated = await removeSubjectTeacher(subjectId, userId);
      setSubjects((prev) => prev.map((x) => (x.id === subjectId ? updated : x)));
      toast.push("success", "Professeur retiré");
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur");
    }
  }

  function openTeachersModal(subject: Subject) {
    setEditCourse(subject);
    setEditTeacherIds((subject.teachers ?? []).map((t: any) => t.id));
    setEditOpen(true);
  }

  function closeTeachersModal() {
    setEditOpen(false);
    setEditCourse(null);
    setEditTeacherIds([]);
  }

  function getModuleInfo(subject: Subject) {
    const mod = subject.learningModule;
    if (!mod) return "-";
    return mod.semester ? `${mod.semester.name} / ${mod.name}` : mod.name;
  }

  async function handleCreateSubject() {
  const title = createTitle.trim();
  if (!title) {
    toast.push("error", "Le titre est obligatoire");
    return;
  }

  setCreateLoading(true);
  setErr("");

  try {
    const created = await createSubject({
      title,
      description: createDescription.trim() ? createDescription.trim() : null,
      learningModuleId: createModuleId ? createModuleId : null, // ✅
    });

    // ✅ soit refresh complet, soit insert local + refresh léger
    setSubjects((prev) => [created, ...prev]);

    // reset form
    setCreateTitle("");
    setCreateDescription("");
    setCreateModuleId("");

    toast.push("success", "Matière créée");
  } catch (e: any) {
    toast.push("error", e?.message ?? "Erreur création matière");
  } finally {
    setCreateLoading(false);
  }
}

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Matières (Courses)</h1>
        <p className="text-slate-600">Affecter les matières aux modules et semestres.</p>
      </div>

      {/* Filtres */}
      <div className="bg-white border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Rechercher une matière..."
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
              .filter((m) => !semesterId || m.semesterId === semesterId)
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

      {/* Bloc Créer une matière */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Créer une matière</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Titre *"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
          
          <input
            type="text"
            placeholder="Description (optionnel)"
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
          
          <select
            value={createModuleId}
            onChange={(e) => setCreateModuleId(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Module (optionnel)</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.semester ? `${m.semester.name} / ${m.name}` : m.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateSubject}
            disabled={createLoading || !createTitle.trim()}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-blue-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {createLoading ? "Création..." : "Créer"}
          </button>
        </div>
      </div>

      {/* Tableau */}
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
                <th className="text-left p-3">Professeurs</th>
                <th className="text-left p-3">Semestre/Module actuel</th>
                <th className="text-left p-3">Affecter au module</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="border-t">
                  <td className="p-3 font-medium">{subject.title}</td>
                  <td className="p-3">
                    <div className="space-y-1">
                      {(subject.teachers ?? []).length === 0 ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        (subject.teachers ?? []).map((t: any) => (
                          <div key={t.id} className="flex items-center justify-between gap-2">
                            <span>{t.fullName || t.email}</span>
                            <button
                              className="text-red-600 text-xs hover:underline"
                              onClick={() => onRemoveTeacher(subject.id, t.id)}
                            >
                              Retirer
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-3">{getModuleInfo(subject)}</td>
                  <td className="p-3">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={subject.learningModuleId || ""}
                      onChange={async (e) => {
                        const moduleId = e.target.value;
                        if (moduleId) {
                          await onSetModule(subject.id, moduleId);
                        } else {
                          await onUnsetModule(subject.id);
                        }
                      }}
                    >
                      <option value="">Aucun module</option>
                      {modules
                        .filter((m) => !semesterId || m.semesterId === semesterId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.semester ? `${m.semester.name} / ${m.name}` : m.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="px-3 py-1 rounded bg-slate-100"
                        onClick={() => openTeachersModal(subject)}
                      >
                        Gérer profs
                      </button>
                      {subject.learningModuleId && (
                        <button
                          className="px-3 py-1 rounded bg-red-100 text-red-700"
                          onClick={() => onUnsetModule(subject.id)}
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
      
      {/* Modal Gérer profs */}
      {editOpen && editCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeTeachersModal}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="text-lg font-semibold">Gérer les professeurs</div>
              <div className="text-sm text-slate-600">
                Matière : <span className="font-medium">{editCourse.title}</span>
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-2">
                {teachers
                  .filter((t) => t.role === "TEACHER")
                  .map((teacher) => (
                    <label key={teacher.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editTeacherIds.includes(teacher.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditTeacherIds((prev) => [...prev, teacher.id]);
                          } else {
                            setEditTeacherIds((prev) => prev.filter((id) => id !== teacher.id));
                          }
                        }}
                      />
                      <span>{teacher.fullName || teacher.email}</span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded border border-slate-300"
                onClick={closeTeachersModal}
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white"
                onClick={async () => {
                  try {
                    const updated = await setSubjectTeachers(editCourse.id, editTeacherIds);
                    setSubjects((prev) => prev.map((x) => (x.id === editCourse.id ? updated : x)));
                    toast.push("success", "Professeurs mis à jour");
                    closeTeachersModal();
                  } catch (e: any) {
                    toast.push("error", e?.message ?? "Erreur");
                  }
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
