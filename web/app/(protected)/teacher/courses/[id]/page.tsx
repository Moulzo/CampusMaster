"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getCourse } from "@/lib/courses";
import { CourseResourcesPanel } from "@/components/course-resources/CourseResourcesPanel";

export default function TeacherCourseDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const courseId = params?.id;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

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
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button className="py-2 px-1 border-b-2 border-blue-500 font-medium text-blue-600">
            Supports de cours
          </button>
          <button className="py-2 px-1 border-b-2 border-transparent font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Devoirs
          </button>
          <button className="py-2 px-1 border-b-2 border-transparent font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Étudiants inscrits
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div>
        <CourseResourcesPanel courseId={courseId!} />
      </div>
    </div>
  );
}
