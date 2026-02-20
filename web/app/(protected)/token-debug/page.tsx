'use client';

import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';

export default function TokenDebugPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const accessToken = getAccessToken();
    setToken(accessToken);
    
    if (accessToken) {
      try {
        // Décoder le token JWT (sans vérifier la signature)
        const parts = accessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          setTokenInfo(payload);
          
          // Vérifier si le token est expiré
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            setError('Token expiré');
          }
        }
      } catch (e) {
        setError('Token invalide');
      }
    } else {
      setError('Aucun token trouvé');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Debug Token</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Token Status</h2>
          
          {error ? (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Erreur:</strong> {error}
            </div>
          ) : (
            <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              <strong>Token valide</strong>
            </div>
          )}
          
          <div className="mt-4">
            <h3 className="font-semibold mb-2 text-gray-900">Token (premiers 50 caractères):</h3>
            <div className="p-2 bg-gray-100 rounded font-mono text-sm break-all">
              {token ? token.substring(0, 50) + '...' : 'Non disponible'}
            </div>
          </div>
          
          {tokenInfo && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2 text-gray-900">Payload du token:</h3>
              <pre className="p-4 bg-gray-100 rounded text-sm overflow-auto">
                {JSON.stringify(tokenInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Se reconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
