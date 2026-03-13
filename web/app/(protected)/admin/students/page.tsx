"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getStudents,
  getLearningModules,
  setStudentModule,
  unsetStudentModule,
  Student,
  LearningModule,
} from "@/lib/admin-academics";
import { SetStudentModuleResult } from "@/lib/admin-users";
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
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkModuleId, setBulkModuleId] = useState<string>("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const moduleOptions = useMemo(() => {
    const opts = modules.map((m) => ({
      id: m.id,
      label: m.semester ? `${m.semester.name} / ${m.name}` : m.name,
      semesterId: m.semesterId,
    }));
    opts.sort((a, b) => a.label.localeCompare(b.label));
    return [{ id: "", label: "Aucun module", semesterId: "" }, ...opts];
  }, [modules]);

  const filteredStudents = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return students.filter((s) => {
      const matchesText =
        !needle ||
        s.fullName.toLowerCase().includes(needle) ||
        s.email.toLowerCase().includes(needle);
      const matchesSemester =
        !semesterId || s.learningModule?.semester?.id === semesterId || false;
      const matchesModule =
        !moduleIdFilter ||
        (moduleIdFilter === "__NONE__"
          ? !s.learningModuleId
          : (s.learningModuleId ?? "") === moduleIdFilter);
      return matchesText && matchesSemester && matchesModule;
    });
  }, [students, q, semesterId, moduleIdFilter]);

  const selectedCount = useMemo(
    () => Object.values(selectedIds).filter(Boolean).length,
    [selectedIds],
  );

  const allChecked = useMemo(() => {
    if (!filteredStudents.length) return false;
    return filteredStudents.every((s) => selectedIds[s.id]);
  }, [filteredStudents, selectedIds]);

  function toggleOne(id: string) {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      const next = { ...prev };
      const target = !allChecked;
      for (const s of filteredStudents) next[s.id] = target;
      return next;
    });
  }

  async function applyBulk() {
    const ids = Object.entries(selectedIds)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!ids.length) {
      toast.push("error", "Aucun étudiant sélectionné");
      return;
    }

    setBulkSaving(true);
    try {
      const results = await Promise.all(
        ids.map((studentId) =>
          bulkModuleId
            ? setStudentModule(studentId, bulkModuleId)
            : unsetStudentModule(studentId),
        ),
      );

      // ✅ Compter les warnings reçus en masse
      const warnings = results.filter((r): r is SetStudentModuleResult => 'warning' in r && r.warning !== null);
      if (warnings.length > 0) {
        toast.push(
          "warning",
          `Affectation effectuée. ${warnings.length} étudiant(s) avaient des soumissions dans leur ancien module — vérifiez les stats.`,
        );
      } else {
        toast.push("success", "Affectation en masse effectuée");
      }

      setSelectedIds({});
      await refresh();
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur affectation en masse");
    } finally {
      setBulkSaving(false);
    }
  }

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

  
  function getModuleInfo(student: Student) {
    const mod = student.learningModule;
    if (!mod) return "-";
    return mod.semester ? `${mod.semester.name} / ${mod.name}` : mod.name;
  }

  useEffect(() => {
    refresh();
  }, [moduleIdFilter, q]);

  const uniqueSemesters = Array.from(
    new Set(modules.map((m) => m.semester?.id).filter(Boolean)),
  );
  const semesterOptions = uniqueSemesters.map((sid) => {
    const mod = modules.find((m) => m.semester?.id === sid);
    return (
      <option key={sid} value={sid}>
        {mod?.semester?.name ?? sid}
      </option>
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Étudiants</h1>
          <button
            className={`px-3 py-2 rounded border ${
              bulkMode
                ? "bg-slate-900 text-white border-slate-900"
                : "hover:bg-slate-50"
            }`}
            onClick={() => {
              setBulkMode((v) => !v);
              setSelectedIds({});
            }}
          >
            {bulkMode ? "Quitter l'affectation en masse" : "Affectation en masse"}
          </button>
        </div>
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
            <option value="__NONE__">Aucun module</option>
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

        {bulkMode && (
          <div className="border-t pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button
                className="px-3 py-2 border rounded hover:bg-slate-50"
                onClick={toggleAllVisible}
                disabled={!filteredStudents.length}
              >
                {allChecked ? "Tout décocher" : "Tout sélectionner"}
              </button>
              <span className="text-sm text-slate-600">
                {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="border rounded px-3 py-2"
                value={bulkModuleId}
                onChange={(e) => setBulkModuleId(e.target.value)}
              >
                <option value="">Aucun module</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.semester ? `${m.semester.name} / ${m.name}` : m.name}
                  </option>
                ))}
              </select>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                onClick={applyBulk}
                disabled={bulkSaving}
              >
                {bulkSaving ? "Application..." : "Appliquer"}
              </button>
            </div>
          </div>
        )}
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
                {bulkMode && (
                  <th className="text-left p-3 w-[44px]">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAllVisible}
                      aria-label="Tout sélectionner"
                    />
                  </th>
                )}
                <th className="text-left p-3">Étudiant</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Module actuel</th>
                <th className="text-right p-3">Détail</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="border-t">
                  {bulkMode && (
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={!!selectedIds[student.id]}
                        onChange={() => toggleOne(student.id)}
                        aria-label={`Sélectionner ${student.fullName}`}
                      />
                    </td>
                  )}
                  <td className="p-3 font-medium">
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="text-blue-700 hover:underline"
                    >
                      {student.fullName}
                    </Link>
                  </td>
                  <td className="p-3">{student.email}</td>
                  <td className="p-3">{getModuleInfo(student)}</td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200"
                      >
                        Voir
                      </Link>
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