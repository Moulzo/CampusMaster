"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getCourse } from "@/lib/courses";
import { CourseResourcesPanel } from "@/components/course-resources/CourseResourcesPanel";
import { StudentAssignmentsTab } from "@/components/student/courses/StudentAssignmentsTab";
import StudentGradesTab from "@/components/student/StudentGradesTab";
import { StudentCourseAnnouncementsTab } from "@/components/student/courses/StudentCourseAnnouncementsTab";

export default function StudentCourseDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();

  const courseId = params?.id;
  const initialTab = (search.get("tab") as any) || "resources";

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"resources" | "assignments" | "grades" | "announcements">(
    initialTab === "assignments" ? "assignments" : initialTab === "grades" ? "grades" : initialTab === "announcements" ? "announcements" : "resources"
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(`/login?next=/student/courses/${courseId}`);
      return;
    }
    if (user.role !== "STUDENT") {
      router.replace(`/`);
      return;
    }

    if (!courseId) {
      setError("ID invalide");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await getCourse(courseId);
        setCourse(data);
      } catch (e: any) {
        setError(e?.message ?? "Erreur chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router, courseId]);

  if (authLoading || loading) return <div className="p-6">Chargement…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!course) return <div className="p-6">Matière introuvable</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>

          {course.learningModule ? (
            <p className="text-sm text-slate-600 mt-1">
              {course.learningModule.semester?.name ? `${course.learningModule.semester.name} / ` : ""}
              {course.learningModule.name}
            </p>
          ) : (
            <p className="text-sm text-slate-500 mt-1">Non affectée à un module</p>
          )}
        </div>

        <button onClick={() => router.back()} className="px-4 py-2 border rounded hover:bg-slate-50">
          ← Retour
        </button>
      </div>

      <div className="flex gap-6 border-b">
        <button
          className={`pb-2 ${tab === "resources" ? "text-blue-600 border-b-2 border-blue-600" : "text-zinc-600"}`}
          onClick={() => setTab("resources")}
        >
          Supports de cours
        </button>

        <button
          className={`pb-2 ${tab === "assignments" ? "text-blue-600 border-b-2 border-blue-600" : "text-zinc-600"}`}
          onClick={() => setTab("assignments")}
        >
          Devoirs
        </button>

        <button
          className={`pb-2 ${tab === "grades" ? "text-blue-600 border-b-2 border-blue-600" : "text-zinc-600"}`}
          onClick={() => setTab("grades")}
        >
          Notes
        </button>

        <button
          className={`pb-2 ${tab === "announcements" ? "text-blue-600 border-b-2 border-blue-600" : "text-zinc-600"}`}
          onClick={() => setTab("announcements")}
        >
          Annonces
        </button>
      </div>

      {tab === "resources" && (
        <CourseResourcesPanel courseId={courseId!} readOnly />
      )}

      {tab === "assignments" && <StudentAssignmentsTab courseId={courseId!} />}

      {tab === "grades" && <StudentGradesTab courseId={courseId!} />}
      {tab === "announcements" && <StudentCourseAnnouncementsTab courseId={courseId!} />}
    </div>
  );
}
