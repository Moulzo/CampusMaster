'use client';

import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';
import { useWebSocket } from '@/hooks/use-websocket';

export default function SimpleTokenTestPage() {
  const [token, setToken] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const { isConnected, notifications, unreadCount } = useWebSocket(token || null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    const accessToken = getAccessToken();
    setToken(accessToken || '');
    addLog(`Token récupéré: ${accessToken ? accessToken.substring(0, 50) + '...' : 'Non trouvé'}`);
  }, []);

  useEffect(() => {
    addLog(`Statut WebSocket: ${isConnected ? 'Connecté' : 'Déconnecté'}`);
  }, [isConnected]);

  useEffect(() => {
    if (notifications.length > 0) {
      addLog(`📨 Notification reçue: ${notifications[notifications.length - 1].title}`);
    }
  }, [notifications]);

  const testWebSocket = () => {
    if (!token) {
      addLog('Erreur: Aucun token disponible');
      return;
    }

    addLog('Test de connexion WebSocket...');
    
    // Import dynamique pour utiliser le service directement
    import('@/lib/websocket').then(({ websocketService }) => {
      // Écouter les événements
      websocketService.on('connect', () => {
        addLog('✅ WebSocket connecté avec succès');
      });

      websocketService.on('authenticated', (data) => {
        addLog(`✅ Authentifié: ${JSON.stringify(data)}`);
      });

      websocketService.on('error', (error) => {
        addLog(`❌ Erreur WebSocket: ${JSON.stringify(error)}`);
      });

      websocketService.on('disconnect', () => {
        addLog('🔌 WebSocket déconnecté');
      });

      // Forcer la reconnexion avec le token
      websocketService.reconnectWithNewToken(token);
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Test Simple WebSocket</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Token Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">État WebSocket</h2>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-600">Statut Hook:</span>
                <div className={`mt-1 px-3 py-2 rounded text-white font-medium ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {isConnected ? 'Connecté' : 'Déconnecté'}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Notifications reçues:</span>
                <div className="mt-1 px-3 py-2 bg-blue-100 rounded">
                  {notifications.length} (Non lues: {unreadCount})
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Token (100 premiers caractères):</span>
                <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                  {token ? token.substring(0, 100) + '...' : 'Non disponible'}
                </div>
              </div>
              <button
                onClick={testWebSocket}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Forcer reconnexion
              </button>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Logs</h2>
              <button
                onClick={clearLogs}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Effacer
              </button>
            </div>
            <div className="h-64 overflow-y-auto bg-gray-900 text-green-400 p-4 rounded font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-gray-500">En attente de logs...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
