"use client";

import { useEffect, useState } from "react";
import { getCourses } from "@/lib/courses";
import { createAssignment, uploadFile } from "@/lib/assignments";
import { useToast } from "@/lib/toast";
import { formatFileSize } from "@/lib/file-size";
import { openFileInBrowser, canPreviewInBrowser } from "@/lib/file-preview";

type Props = {
  defaultCourseId?: string;
  onCreated?: () => void;
};

function getMinDateTimeLocalValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);

  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function isPastDateTimeLocal(value: string) {
  if (!value) return false;

  const selectedDate = new Date(value);
  return selectedDate.getTime() <= Date.now();
}

export function AssignmentForm({ defaultCourseId, onCreated }: Props) {
  const toast = useToast();
  
  const [formLoading, setFormLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxScore, setMaxScore] = useState<string>("20");
  const [attachment, setAttachment] = useState<{ url: string; name?: string; size?: number; type?: string } | null>(null);
  const [formCourseId, setFormCourseId] = useState<string>(defaultCourseId || "");
  const [courses, setCourses] = useState<any[]>([]);
  const [error, setError] = useState("");

  const minDueDate = getMinDateTimeLocalValue();

  // Charger les cours seulement si defaultCourseId n'est pas fourni
  useEffect(() => {
    if (!defaultCourseId) {
      getCourses().then(setCourses).catch(console.error);
    }
  }, [defaultCourseId]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault(); // Empêche le rechargement de page
    
    if (!title.trim()) return;
    if (!dueDate) return;
    if (isPastDateTimeLocal(dueDate)) {
      setError("La date limite doit être dans le futur.");
      toast.push("error", "La date limite doit être dans le futur.");
      return;
    }
    if (!formCourseId) {
      setError("Sélectionne un cours pour créer un devoir.");
      return;
    }

    const ms = Number(maxScore);
    if (Number.isNaN(ms) || ms <= 0 || ms > 1000) {
      setError("maxScore invalide");
      return;
    }

    setFormLoading(true);
    setError("");
    try {
      const created = await createAssignment(
        title,
        description || undefined,
        new Date(dueDate).toISOString(),
        formCourseId,
        {
          maxScore: ms,
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name,
          attachmentSize: attachment?.size,
          attachmentMimeType: attachment?.type,
        },
      );
      
      // Reset form
      setTitle("");
      setDescription("");
      setDueDate("");
      setMaxScore("20");
      setAttachment(null);
      if (!defaultCourseId) {
        setFormCourseId("");
      }
      
      toast.push("success", "Devoir créé avec succès");
      onCreated?.();
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
      toast.push("error", e?.message ?? "Erreur lors de la création");
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <form onSubmit={handleCreateAssignment} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Titre</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            required
          />
        </div>
        
        {/* Afficher le dropdown seulement si defaultCourseId n'est pas fourni */}
        {!defaultCourseId ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Cours *</label>
            <select
              value={formCourseId}
              onChange={(e) => setFormCourseId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              required
            >
              <option value="">Sélectionner un cours</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Date limite</label>
          <input
            type="datetime-local"
            value={dueDate}
            min={minDueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Note max</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Fichier consigne (optionnel)</label>
        <input
          type="file"
          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError("");
            setFormLoading(true);
            try {
              const up = await uploadFile(file);
              setAttachment({ url: up.fileUrl, name: file.name, size: file.size, type: file.type });
              toast.push("success", "Fichier consigne uploadé");
            } catch (err: any) {
              setError(err?.message ?? "Erreur");
              toast.push("error", err?.message ?? "Erreur upload");
            } finally {
              setFormLoading(false);
            }
          }}
        />
        {attachment && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-700 truncate">{attachment.name}</p>
            {(() => {
              const readableSize = formatFileSize(attachment.size);

              return readableSize ? (
                <p className="mt-1 text-xs text-blue-600">
                  Taille : {readableSize}
                </p>
              ) : null;
            })()}
            {attachment.url && (
              <button
                type="button"
                onClick={() => void openFileInBrowser(attachment.url)}
                className="mt-2 text-xs font-medium text-blue-700 underline hover:text-blue-900"
              >
                {canPreviewInBrowser(attachment.type, attachment.name) ? "Consulter le fichier" : "Ouvrir le fichier"}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setTitle("");
            setDescription("");
            setDueDate("");
            setMaxScore("20");
            setAttachment(null);
            if (!defaultCourseId) {
              setFormCourseId("");
            }
          }}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={formLoading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition"
        >
          {formLoading ? "Création..." : "Créer le devoir"}
        </button>
      </div>
    </form>
  );
}
