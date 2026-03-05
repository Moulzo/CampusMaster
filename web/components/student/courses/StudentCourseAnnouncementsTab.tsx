"use client";

import { useEffect, useState } from "react";
import { listCourseAnnouncements, Announcement } from "@/lib/announcements";

export function StudentCourseAnnouncementsTab({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
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
    })();
  }, [courseId]);

  // ✅ Auto-scroll avec hash
  useEffect(() => {
    if (!window.location.hash) return;
    const el = document.querySelector(window.location.hash);
    if (!el) return;
    
    // Attendre que les données soient chargées
    setTimeout(() => {
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [items.length]);

  if (loading) return <div className="p-4 text-sm text-zinc-600">Chargement…</div>;
  if (err) return <div className="p-4 text-sm text-red-700">{err}</div>;

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-sm text-zinc-600">Aucune annonce pour le moment.</div>
      ) : (
        items.map((a) => (
          <div key={a.id} id={`announcement-${a.id}`} className="border rounded-lg p-4 bg-white">
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
            <div className="mt-3 text-sm text-zinc-800 whitespace-pre-wrap">{a.content}</div>
          </div>
        ))
      )}
    </div>
  );
}
