"use client";

import { useEffect, useState } from "react";
import {
  listCourseResources,
  uploadCourseResource,
  downloadCourseResource,
  deleteCourseResource,
  trackCourseResourceView,
  getCourseResourceDownloadUrl,
  type CourseResource,
  formatFileSize,
  formatDate,
  getFileIcon,
} from "@/lib/course-resources";

// Helper pour afficher l'uploader
function uploaderLabel(r: { uploadedBy: { fullName: string | null; email: string } | null }) {
  const u = r.uploadedBy;
  if (!u) return "—";
  return u.fullName && u.fullName.trim() ? u.fullName : u.email;
}

export function CourseResourcesPanel({
  courseId,
  readOnly = false,
}: {
  courseId: string;
  readOnly?: boolean;
}) {
  const [items, setItems] = useState<CourseResource[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [viewingIds, setViewingIds] = useState<Set<string>>(new Set());

  async function refresh() {
    setLoading(true);
    try {
      const data = await listCourseResources(courseId);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [courseId]);

  async function onDelete(resourceId: string) {
    if (readOnly) return;
    if (viewingIds.has(resourceId) || downloadingIds.has(resourceId) || saving) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce support ?")) {
      return;
    }

    try {
      await deleteCourseResource(resourceId);
      await refresh();
      alert("Support supprimé ✅");
    } catch (e: any) {
      alert(e?.message ?? "Suppression impossible");
    }
  }

  async function onDownload(resourceId: string, filename: string) {
    if (downloadingIds.has(resourceId) || saving) return;
    
    setDownloadingIds(prev => new Set(prev).add(resourceId));
    try {
      await downloadCourseResource(resourceId, filename);
    } catch (e: any) {
      alert(e?.message ?? "Téléchargement impossible");
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(resourceId);
        return newSet;
      });
    }
  }

  async function onView(resourceId: string) {
    if (viewingIds.has(resourceId) || downloadingIds.has(resourceId) || saving) return;

    setViewingIds((prev) => new Set(prev).add(resourceId));
    try {
      await trackCourseResourceView(resourceId);
      
      // Télécharger le fichier de manière authentifiée et l'ouvrir dans un nouvel onglet
      const { apiFetch } = await import("@/lib/auth");
      const res = await apiFetch(`/courses/resources/${resourceId}/download`, {
        method: "GET",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      // Nettoyer après un délai pour permettre au navigateur de démarrer le chargement
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      alert(e?.message ?? "Consultation impossible");
    } finally {
      setViewingIds((prev) => {
        const next = new Set(prev);
        next.delete(resourceId);
        return next;
      });
    }
  }

  async function onUpload() {
    if (readOnly) return;
    if (saving || viewingIds.size > 0 || downloadingIds.size > 0) return;
    if (!file) return alert("Choisis un fichier.");
    if (!title.trim()) return alert("Titre requis.");
    
    // Vérifier la taille du fichier (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert("Le fichier est trop volumineux (max: 50MB)");
      return;
    }

    setSaving(true);
    try {
      await uploadCourseResource(courseId, { title, description, file });
      setTitle("");
      setDescription("");
      setFile(null);
      await refresh();
      alert("Support ajouté ✅");
    } catch (e: any) {
      alert(e?.message ?? "Upload impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Supports de cours</h2>

      {!readOnly && (
        <div className="border rounded-lg p-4 space-y-3 bg-white">
        <div>
          <label className="block text-sm font-medium">Titre</label>
          <input 
            className="border rounded-md p-2 w-full" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            disabled={saving || viewingIds.size > 0 || downloadingIds.size > 0}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <input 
            className="border rounded-md p-2 w-full" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            disabled={saving || viewingIds.size > 0 || downloadingIds.size > 0}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Fichier</label>
          <label className="block">
            <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 disabled:opacity-50">
              {file ? file.name : "Choisir un fichier"}
            </span>
            <input 
              type="file" 
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} 
              className="hidden"
              disabled={saving || viewingIds.size > 0 || downloadingIds.size > 0}
            />
          </label>
          {file && (
            <div className="text-sm text-gray-600 mt-1">
              Taille: {formatFileSize(file.size)}
            </div>
          )}
        </div>

        <button
          onClick={onUpload}
          disabled={saving || viewingIds.size > 0 || downloadingIds.size > 0}
          className="px-4 py-2 rounded-md bg-zinc-900 text-white disabled:opacity-50"
        >
          {saving ? "Upload..." : "Ajouter le support"}
        </button>
        </div>
      )}

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="border rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getFileIcon(r.mimeType)}</span>
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="text-sm text-zinc-600">{r.filename}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Taille: {formatFileSize(r.size)}</span>
                    <span>•</span>
                    <span>Ajouté: {formatDate(r.createdAt)}</span>
                    <span>•</span>
                    <span>Par: {uploaderLabel(r)}</span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    className="underline disabled:opacity-50"
                    onClick={() => onView(r.id)}
                    disabled={viewingIds.has(r.id) || downloadingIds.has(r.id) || saving}
                  >
                    {viewingIds.has(r.id) ? "Ouverture..." : "Consulter"}
                  </button>

                  <button
                    className="underline disabled:opacity-50"
                    onClick={() => onDownload(r.id, r.filename)}
                    disabled={viewingIds.has(r.id) || downloadingIds.has(r.id) || saving}
                  >
                    {downloadingIds.has(r.id) ? "Téléchargement..." : "Télécharger"}
                  </button>
                  {!readOnly && (
                    <button
                      className="text-red-600 underline disabled:opacity-50"
                      onClick={() => onDelete(r.id)}
                      disabled={viewingIds.has(r.id) || downloadingIds.has(r.id) || saving}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-zinc-500">Aucun support pour l'instant.</p>}
        </div>
      )}
    </div>
  );
}
