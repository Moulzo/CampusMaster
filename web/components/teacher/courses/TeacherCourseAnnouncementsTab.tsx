"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/lib/toast";
import {
  Announcement,
  createCourseAnnouncement,
  deleteAnnouncement,
  listCourseAnnouncements,
  updateAnnouncement,
} from "@/lib/announcements";

export function TeacherCourseAnnouncementsTab({ courseId }: { courseId: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState<Announcement[]>([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const data = await listCourseAnnouncements(courseId);
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur chargement annonces");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!courseId) return;
    void refresh();
  }, [courseId]);

  async function submit() {
    if (!title.trim() || !content.trim()) {
      toast.push("error", "Titre et contenu requis");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateAnnouncement(editingId, { title: title.trim(), content: content.trim() });
        toast.push("success", "Annonce mise à jour");
      } else {
        await createCourseAnnouncement(courseId, { title: title.trim(), content: content.trim() });
        toast.push("success", "Annonce publiée");
      }
      setTitle("");
      setContent("");
      setEditingId(null);
      await refresh();
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: Announcement) {
    setEditingId(a.id);
    setTitle(a.title);
    setContent(a.content);
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette annonce ?")) return;
    try {
      await deleteAnnouncement(id);
      toast.push("success", "Annonce supprimée");
      await refresh();
    } catch (e: any) {
      toast.push("error", e?.message ?? "Erreur suppression");
    }
  }

  if (loading) return <div className="p-4 text-sm text-zinc-600">Chargement…</div>;
  if (err) return <div className="p-4 text-sm text-red-700">{err}</div>;

  return (
    <div className="space-y-5">
      <div className="border rounded-lg p-4 bg-white">
        <div className="font-semibold mb-2">{editingId ? "Modifier l'annonce" : "Nouvelle annonce"}</div>

        <div className="space-y-3">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Titre"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full border rounded px-3 py-2 min-h-[110px]"
            placeholder="Contenu"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="flex items-center gap-2 justify-end">
            {editingId && (
              <button
                className="px-3 py-2 border rounded hover:bg-zinc-50"
                onClick={() => {
                  setEditingId(null);
                  setTitle("");
                  setContent("");
                }}
                disabled={saving}
              >
                Annuler
              </button>
            )}
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              onClick={submit}
              disabled={saving}
            >
              {saving ? "Enregistrement…" : editingId ? "Mettre à jour" : "Publier"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-zinc-600">Aucune annonce pour le moment.</div>
        ) : (
          items.map((a) => (
            <div key={a.id} className="border rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Publiée le{" "}
                    {new Date(a.createdAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {a.author?.fullName ? ` — ${a.author.fullName}` : ""}
                  </div>
                </div>

                <div className="shrink-0 flex gap-2">
                  <button className="px-3 py-1.5 border rounded hover:bg-zinc-50" onClick={() => startEdit(a)}>
                    Modifier
                  </button>
                  <button className="px-3 py-1.5 border rounded text-red-700 hover:bg-red-50" onClick={() => remove(a.id)}>
                    Supprimer
                  </button>
                </div>
              </div>

              <div className="mt-3 text-sm text-zinc-800 whitespace-pre-wrap">{a.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
