"use client";

import { useEffect, useState } from "react";
import { listCourseResources, uploadCourseResource, downloadCourseResource, deleteCourseResource, type CourseResource } from "@/lib/course-resources";

export function CourseResourcesPanel({ courseId }: { courseId: string }) {
  const [items, setItems] = useState<CourseResource[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function onUpload() {
    if (!file) return alert("Choisis un fichier.");
    if (!title.trim()) return alert("Titre requis.");

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

      <div className="border rounded-lg p-4 space-y-3 bg-white">
        <div>
          <label className="block text-sm">Titre</label>
          <input 
            className="border rounded-md p-2 w-full" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
          />
        </div>

        <div>
          <label className="block text-sm">Description</label>
          <input 
            className="border rounded-md p-2 w-full" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
          />
        </div>

        <div>
          <label className="block text-sm">Fichier</label>
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} 
          />
        </div>

        <button
          onClick={onUpload}
          disabled={saving}
          className="px-4 py-2 rounded-md bg-zinc-900 text-white disabled:opacity-60"
        >
          {saving ? "Upload..." : "Ajouter le support"}
        </button>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="border rounded-lg p-3 bg-white flex items-center justify-between">
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-sm text-zinc-600">{r.filename}</div>
              </div>

              <div className="flex gap-2">
                <button
                  className="underline"
                  onClick={() => downloadCourseResource(r.id, r.filename)}
                >
                  Télécharger
                </button>
                <button
                  className="text-red-600 underline"
                  onClick={() => onDelete(r.id)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-zinc-500">Aucun support pour l'instant.</p>}
        </div>
      )}
    </div>
  );
}
