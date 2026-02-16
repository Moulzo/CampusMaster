"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setTokens } from "@/lib/auth";

const API_URL = "http://localhost:3001/api";

function getDefaultRouteForRole(role?: string) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "TEACHER":
      return "/teacher";
    default:
      return "/student"; // STUDENT (ou inconnu)
  }
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // next optionnel (ex: /login?next=/admin)
  const rawNext = searchParams.get("next");
  const safeNext = rawNext && rawNext.startsWith("/") ? rawNext : null;

  const [email, setEmail] = useState("admin@campusmaster.test");
  const [password, setPassword] = useState("Pass1234!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // login = endpoint public => fetch direct
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text || `HTTP ${res.status}`);
        return;
      }

      const data = await res.json();

      // Ton API renvoie { user, accessToken, refreshToken }
      setTokens(data.accessToken, data.refreshToken);

      // 1) Si on venait d’une page protégée => on y retourne
      if (safeNext) {
        router.replace(safeNext);
        return;
      }

      // 2) Sinon, on route selon le rôle (projet multi-espaces)
      const role = data?.user?.role as string | undefined;
      router.replace(getDefaultRouteForRole(role));
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  // Quick login helpers
  function quickLogin(testEmail: string) {
    setEmail(testEmail);
    setPassword("Pass1234!");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">CampusMaster</h1>
          <p className="text-blue-100">Plateforme de Gestion Académique</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Se connecter</h2>

          <form onSubmit={login} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                placeholder="exemple@mail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Quick Login Helpers */}
          <div className="border-t border-slate-200 pt-6">
            <p className="text-xs text-slate-500 font-semibold uppercase mb-3">
              Comptes de test
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => quickLogin("admin@campusmaster.test")}
                className="w-full px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium rounded-lg border border-purple-200 transition flex items-center justify-center gap-2"
              >
                <span>👤</span> Admin
              </button>
              <button
                type="button"
                onClick={() => quickLogin("teacher@campusmaster.test")}
                className="w-full px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg border border-blue-200 transition flex items-center justify-center gap-2"
              >
                <span>👨‍🏫</span> Enseignant
              </button>
              <button
                type="button"
                onClick={() => quickLogin("student@campusmaster.test")}
                className="w-full px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 font-medium rounded-lg border border-green-200 transition flex items-center justify-center gap-2"
              >
                <span>👨‍🎓</span> Étudiant
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center mt-4">
              Tous les mots de passe: <code className="font-mono">Pass1234!</code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-blue-100 text-sm">
          <p>© 2026 CampusMaster. Tous droits réservés.</p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Chargement...</p>}>
      <LoginInner />
    </Suspense>
  );
}
