"use client";

import { useSemesterResults } from "@/hooks/use-semester-results";
import { useRouter } from "next/navigation";

export default function ResultsPage() {
  const { results, loading, error } = useSemesterResults();
  const router = useRouter();

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des résultats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Erreur</h2>
          <p className="text-red-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">
          Aucun résultat disponible
        </div>
      </div>
    );
  }

  // Optimisation : créer les dates une seule fois
  const startDate = results.semester.startDate ? new Date(results.semester.startDate) : null;
  const endDate = results.semester.endDate ? new Date(results.semester.endDate) : null;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* En-tête avec semestre et module */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {results.semester.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Module : {results.module.name}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {results.overallAverage !== null ? `${results.overallAverage}/20` : "N/A"}
            </div>
            <p className="text-sm text-gray-500">Moyenne semestrielle</p>
          </div>
        </div>
        
        {startDate && (
          <div className="mt-4 text-sm text-gray-500">
            Période : {startDate.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric"
            })}
            {endDate && ` - ${endDate.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short", 
              year: "numeric"
            })}`}
          </div>
        )}
      </div>

      {/* Tableau des résultats par matière */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Résultats par matière</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Matière
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Moyenne
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Corrigés
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  En attente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Non soumis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.courses.map((course) => (
                <tr key={course.courseId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <button
                      onClick={() => router.push(`/student/courses/${course.courseId}?tab=grades`)}
                      className="text-left hover:underline"
                    >
                      {course.title}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      course.average !== null && course.average >= 12
                        ? "bg-green-100 text-green-800"
                        : course.average !== null && course.average >= 10
                        ? "bg-yellow-100 text-yellow-800"
                        : course.average !== null && course.average >= 8
                        ? "bg-orange-100 text-orange-800"
                        : course.average !== null
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {course.average !== null ? `${course.average}/20` : "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {course.gradedCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {course.pendingCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {course.missingCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {course.totalAssignments}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistiques récapitulatives */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-8-8a1 1 0 011.414-1.414l8 8a1 1 0 001.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Devoirs corrigés</p>
              <p className="text-2xl font-bold text-gray-900">
                {results.courses.reduce((sum, course) => sum + course.gradedCount, 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0116 0zm-1-8a1 1 0 00-1 1v4a1 1 0 002 0V11a1 1 0 00-1-1zM8 8a1 1 0 00-1 1v4a1 1 0 002 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">En attente de correction</p>
              <p className="text-2xl font-bold text-gray-900">
                {results.courses.reduce((sum, course) => sum + course.pendingCount, 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L10 10.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10l4.293-4.293a1 1 0 01-1.414-1.414L10 5.586 5.707a1 1 0 010-1.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Non soumis</p>
              <p className="text-2xl font-bold text-gray-900">
                {results.courses.reduce((sum, course) => sum + course.missingCount, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
