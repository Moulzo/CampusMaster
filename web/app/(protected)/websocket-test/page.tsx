'use client';

import { useEffect, useState } from 'react';
import { websocketService } from '@/lib/websocket';
import { getAccessToken } from '@/lib/auth';

export default function WebSocketTestPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const accessToken = getAccessToken();
    setToken(accessToken);
    
    if (accessToken) {
      // Ajouter les logs pour le debug
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = (...args) => {
        setLogs(prev => [...prev, `LOG: ${args.join(' ')}`]);
        originalLog(...args);
      };
      
      console.error = (...args) => {
        setLogs(prev => [...prev, `ERROR: ${args.join(' ')}`]);
        originalError(...args);
      };

      websocketService.connect(accessToken);
      
      // Écouter les événements de connexion
      websocketService.on('connect', () => {
        setIsConnected(true);
        setLogs(prev => [...prev, 'WebSocket connecté']);
      });
      
      websocketService.on('disconnect', () => {
        setIsConnected(false);
        setLogs(prev => [...prev, 'WebSocket déconnecté']);
      });

      return () => {
        console.log = originalLog;
        console.error = originalError;
        websocketService.disconnect();
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Test WebSocket</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Statut de connexion */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Statut de connexion</h2>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-600">Token:</span>
                <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                  {token ? `${token.substring(0, 20)}...` : 'Non disponible'}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">WebSocket:</span>
                <div className={`mt-1 px-3 py-2 rounded text-white font-medium ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {isConnected ? 'Connecté' : 'Déconnecté'}
                </div>
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Logs de connexion</h2>
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

        {/* Actions de test */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Actions de test</h2>
          <div className="space-y-4">
            <button
              onClick={() => {
                if (token) {
                  websocketService.disconnect();
                  setTimeout(() => websocketService.connect(token), 1000);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Reconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
