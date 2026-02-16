"use client";

import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md border border-slate-200">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">403</h1>
        <p className="text-lg text-slate-600 mb-6">Accès interdit</p>
        <p className="text-sm text-slate-500 mb-8">
          Tu n'as pas les droits nécessaires pour accéder à cette page.
        </p>
        <Link
          href="/student"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
