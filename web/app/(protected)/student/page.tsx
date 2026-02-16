"use client";

import { useAuth } from "@/lib/auth-context";
import { logout } from "@/lib/auth";

export default function StudentPage() {
  const { user, loading } = useAuth();

  if (loading) return <p className="p-6">Chargement...</p>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Espace Étudiant</h1>
            <p className="text-sm text-slate-500 mt-1">Consultez vos cours et devoirs</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full mx-auto flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {user?.fullName?.charAt(0)?.toUpperCase() || "E"}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-4">{user?.fullName}</h2>
                <p className="text-sm text-emerald-600 font-medium mt-1">Étudiant</p>
              </div>
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Email</p>
                  <p className="text-sm text-slate-900 truncate">{user?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">ID</p>
                  <p className="text-xs text-slate-600 font-mono">{user?.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Mes Cours</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">0</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📚</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Devoirs</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">0</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📋</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Moyenne</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">--</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                </div>
              </div>
            </div>

            {/* My Courses Section */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Mes Cours</h3>
                <div className="space-y-3">
                <div className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer" onClick={() => window.location.href = '/student/courses'}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">Mes Cours</p>
                      <p className="text-sm text-slate-500">Consultez vos inscriptions</p>
                    </div>
                    <span className="text-2xl">📚</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 border-2 border-dashed border-slate-300 rounded-lg text-center text-slate-500">
                <p className="text-sm">Aucun cours pour le moment</p>
              </div>
            </div>

            {/* Next Assignments */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Prochains Devoirs</h3>
              <div className="space-y-3">
                <div className="p-4 border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">Devoir 1 - Analyse</p>
                      <p className="text-sm text-slate-500">À rendre avant le 20 Feb</p>
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                      En cours
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 border-2 border-dashed border-slate-300 rounded-lg text-center text-slate-500">
                <p className="text-sm">Aucun devoir pour le moment</p>
              </div>
            </div>

            {/* Debug Info */}
            <details className="bg-slate-900 rounded-lg p-4 text-slate-400 text-xs font-mono">
              <summary className="cursor-pointer font-bold text-slate-300 mb-3">Données Utilisateur</summary>
              <pre className="overflow-x-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </main>
    </div>
  );
}
