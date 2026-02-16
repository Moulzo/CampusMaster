"use client";

import { RequireRole } from "@/lib/require-role";
import { useAuth } from "@/lib/auth-context";
import { logout } from "@/lib/auth";

export default function TeacherPage() {
  const { user, loading } = useAuth();

  return (
    <RequireRole role="TEACHER">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Espace Enseignant</h1>
              <p className="text-sm text-slate-500 mt-1">Gérez vos cours et notes</p>
            </div>
            <button
              onClick={() => logout()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
            >
              Se déconnecter
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {user?.fullName?.charAt(0)?.toUpperCase() || "E"}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mt-4">{user?.fullName}</h2>
                    <p className="text-sm text-blue-600 font-medium mt-1">Enseignant</p>
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
                        <p className="text-sm text-slate-500">Étudiants</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">0</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">👥</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Devoirs</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">0</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl">✏️</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Actions Rapides</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={() => window.location.href = '/teacher/courses'} className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
                      <span>➕</span> Gérer Mes Cours
                    </button>
                    <button className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
                      <span>📋</span> Créer un Devoir
                    </button>
                    <button className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
                      <span>📊</span> Notes
                    </button>
                    <button className="px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
                      <span>📧</span> Messages
                    </button>
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
          )}
        </main>
      </div>
    </RequireRole>
  );
}
