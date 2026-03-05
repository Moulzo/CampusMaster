"use client";

import { useEffect, useState } from "react";
import { getAssignments, createSubmission, uploadFile, Assignment } from "@/lib/assignments";
import { useToast } from "@/lib/toast";

function latestSubmission(subs: any[] | undefined) {
  if (!subs || subs.length === 0) return null;
  return [...subs].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  )[0];
}

function isCorrected(sub: any) {
  return !!sub?.correctedAt || (sub?.score !== null && sub?.score !== undefined);
}

function computeLate(assignment: any, sub: any | null) {
  const dueAt = assignment?.dueDate ? new Date(assignment.dueDate) : null;
  if (!dueAt) return { isLate: false, label: "" };

  // pas de soumission + deadline dépassée => en retard
  if (!sub) {
    const late = Date.now() > dueAt.getTime();
    return { isLate: late, label: late ? "En retard" : "" };
  }

  // soumission existante : en retard si soumis après la deadline
  const submittedAt = sub?.submittedAt ? new Date(sub.submittedAt) : null;
  const late = !!submittedAt && submittedAt.getTime() > dueAt.getTime();

  return { isLate: late, label: late ? "En retard" : "" };
}

interface StudentAssignmentsTabProps {
  courseId: string;
}

export function StudentAssignmentsTab({ courseId }: StudentAssignmentsTabProps) {
  const toast = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssignments() {
      try {
        const data = await getAssignments(courseId);
        setAssignments(data);
      } catch (e: any) {
        toast.push("error", e?.message ?? "Erreur chargement devoirs");
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, [courseId, toast]);

  // ✅ Auto-scroll avec hash
  useEffect(() => {
    if (!window.location.hash) return;
    const el = document.querySelector(window.location.hash);
    if (!el) return;
    
    // Attendre que les données soient chargées
    setTimeout(() => {
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [assignments.length]);

  async function handleFileUpload(assignmentId: string, file: File) {
    setUploading(assignmentId);
    
    try {
      // Upload du fichier
      const uploadedFile = await uploadFile(file);
      
      // Créer la soumission
      await createSubmission(assignmentId, uploadedFile.fileUrl);
      
      toast.push("success", "Devoir déposé avec succès");
      
      // Rafraîchir la liste des devoirs pour voir la soumission
      const updatedAssignments = await getAssignments(courseId);
      setAssignments(updatedAssignments);
      
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur lors du dépôt");
    } finally {
      setUploading(null);
    }
  }

  if (loading) {
    return <div className="p-4">Chargement des devoirs...</div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="p-4 text-center text-slate-600">
        Aucun devoir pour cette matière.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => {
        const sub = latestSubmission(assignment.submissions);
        const hasSubmitted = !!sub;
        const corrected = isCorrected(sub);
        const { isLate, label: lateLabel } = computeLate(assignment, sub);
        
        // Debug temporaire
        console.log("dueDate", assignment.dueDate, "submittedAt", sub?.submittedAt, "isLate", isLate);
        
        return (
          <div key={assignment.id} id={`assignment-${assignment.id}`} className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{assignment.title}</h3>
                {assignment.description && (
                  <p className="text-slate-600 mt-1">{assignment.description}</p>
                )}
                
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  {assignment.dueDate && (
                    <span>
                      📅 Limite: {new Date(assignment.dueDate).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  {assignment.maxScore && (
                    <span>📊 Note max: {assignment.maxScore}</span>
                  )}
                </div>

                {hasSubmitted && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm flex items-center justify-between">
                    <span>
                      ✅ Déjà déposé ({assignment.submissions!.length} fichier
                      {assignment.submissions!.length > 1 ? "s" : ""})
                      {sub?.submittedAt && (
                        <span className="ml-2 text-xs">
                          le {new Date(sub.submittedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      )}
                    </span>

                    {corrected && (
                      <span className="text-emerald-800 font-medium">
                        Corrigé : {sub?.score ?? "-"} / {assignment.maxScore ?? 20}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Badge unique "En retard" (en haut à droite) */}
              {isLate && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-amber-100 text-amber-700">
                  {lateLabel || "En retard"}
                </span>
              )}

              <div className="ml-4">
                <input
                  type="file"
                  id={`file-${assignment.id}`}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(assignment.id, file);
                      e.target.value = ""; // Reset pour pouvoir re-uploader le même fichier
                    }
                  }}
                  disabled={uploading === assignment.id || corrected}
                />
                
                <label
                  htmlFor={`file-${assignment.id}`}
                  className={`inline-block px-4 py-2 rounded cursor-pointer text-sm font-medium transition-colors ${
                    uploading === assignment.id
                      ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                      : corrected
                      ? "bg-emerald-50 text-emerald-700 cursor-not-allowed"
                      : hasSubmitted
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {uploading === assignment.id
                    ? "Dépôt en cours..."
                    : corrected
                    ? "Corrigé"
                    : hasSubmitted
                    ? "Remplacer"
                    : "Déposer"}
                </label>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
