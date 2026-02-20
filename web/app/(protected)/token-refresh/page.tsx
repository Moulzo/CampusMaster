'use client';

import { useEffect, useState } from 'react';
import { getAccessToken, setTokens, clearTokens } from '@/lib/auth';

export default function TokenRefreshPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = () => {
    const accessToken = getAccessToken();
    setToken(accessToken);
    
    if (accessToken) {
      try {
        const parts = accessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          setTokenInfo(payload);
          
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            setError('Token expiré');
          } else {
            setError('');
          }
        }
      } catch (e) {
        setError('Token invalide');
      }
    } else {
      setError('Aucun token trouvé');
    }
  };

  const refreshToken = async () => {
    setLoading(true);
    try {
      const success = await (await import('@/lib/auth')).refreshTokens();
      
      if (success) {
        checkToken();
        setError('');
        
        // Forcer le rechargement complet pour réinitialiser tous les services
        setTimeout(() => {
          window.location.href = '/test-notifications';
        }, 500);
      } else {
        setError('Impossible de rafraîchir le token');
      }
    } catch (err) {
      setError('Erreur lors du rafraîchissement');
    } finally {
      setLoading(false);
    }
  };

  const clearToken = () => {
    clearTokens();
    setToken(null);
    setTokenInfo(null);
    setError('Token supprimé');
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Gestion du Token</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">État du Token</h2>
          
          {error ? (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
              <strong>Erreur:</strong> {error}
            </div>
          ) : (
            <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded mb-4">
              <strong>Token valide</strong>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-gray-900">Token (premiers 50 caractères):</h3>
              <div className="p-2 bg-gray-100 rounded font-mono text-sm break-all">
                {token ? token.substring(0, 50) + '...' : 'Non disponible'}
              </div>
            </div>
            
            {tokenInfo && (
              <div>
                <h3 className="font-semibold mb-2 text-gray-900">Payload du token:</h3>
                <pre className="p-4 bg-gray-100 rounded text-sm overflow-auto">
                  {JSON.stringify(tokenInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Actions</h2>
          <div className="space-y-2">
            <button
              onClick={refreshToken}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 mr-2"
            >
              {loading ? 'Rafraîchissement...' : 'Rafraîchir le token'}
            </button>
            
            <button
              onClick={clearToken}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Supprimer et se reconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
