"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getCourse } from "@/lib/courses";
import { CourseResourcesPanel } from "@/components/course-resources/CourseResourcesPanel";
import { CourseAssignmentsTab } from "@/components/teacher/courses/CourseAssignmentsTab";
import { CourseStudentsTab } from "@/components/teacher/courses/CourseStudentsTab";

export default function TeacherCourseDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const courseId = params?.id;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [tab, setTab] = useState<"resources" | "assignments" | "students">("resources");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(`/login?next=/teacher/courses/${courseId}`);
      return;
    }
    if (user.role !== "TEACHER") {
      router.replace(`/login?next=/teacher/courses/${courseId}`);
      return;
    }

    if (!courseId) {
      setError("ID de cours invalide");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await getCourse(courseId);
        setCourse(data);
      } catch (err: any) {
        setError(err.message ?? "Erreur lors du chargement du cours");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router, courseId]);

  if (authLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Erreur:</strong> {error}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Cours non trouvé
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          {course.description && (
            <p className="text-gray-600 mt-2">{course.description}</p>
          )}
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← Retour
        </button>
      </div>

      {/* Onglets */}
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
          className={`pb-2 ${tab === "students" ? "text-blue-600 border-b-2 border-blue-600" : "text-zinc-600"}`}
          onClick={() => setTab("students")}
        >
          Étudiants inscrits
        </button>
      </div>

      {/* Contenu des onglets */}
      <div>
        {tab === "resources" && <CourseResourcesPanel courseId={courseId!} />}
        {tab === "assignments" && <CourseAssignmentsTab courseId={courseId!} />}
        {tab === "students" && <CourseStudentsTab courseId={courseId!} />}
      </div>
    </div>
  );
}
