"use client";

import { useEffect, useState } from "react";
import { getAssignments, createSubmission, uploadFile, Assignment } from "@/lib/assignments";
import { useToast } from "@/lib/toast";

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
        const hasSubmitted = assignment.submissions && assignment.submissions.length > 0;
        const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
        
        return (
          <div key={assignment.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{assignment.title}</h3>
                {assignment.description && (
                  <p className="text-slate-600 mt-1">{assignment.description}</p>
                )}
                
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  {assignment.dueDate && (
                    <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                      📅 Limite: {new Date(assignment.dueDate).toLocaleDateString('fr-FR')}
                      {isOverdue && " (en retard)"}
                    </span>
                  )}
                  {assignment.maxScore && (
                    <span>📊 Note max: {assignment.maxScore}</span>
                  )}
                </div>

                {hasSubmitted && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                    ✅ Déjà déposé ({assignment.submissions!.length} fichier{assignment.submissions!.length > 1 ? 's' : ''})
                  </div>
                )}
              </div>

              <div className="ml-4">
                <input
                  type="file"
                  id={`file-${assignment.id}`}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(assignment.id, file);
                    }
                  }}
                  disabled={uploading === assignment.id}
                />
                
                <label
                  htmlFor={`file-${assignment.id}`}
                  className={`inline-block px-4 py-2 rounded cursor-pointer text-sm font-medium transition-colors ${
                    uploading === assignment.id
                      ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                      : hasSubmitted
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {uploading === assignment.id
                    ? "Dépôt en cours..."
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
