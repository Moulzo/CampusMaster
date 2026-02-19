'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';
import Notifications from '@/components/Notifications';

export default function TestNotifications() {
  const [userId, setUserId] = useState('test-user-id');
  const toast = useToast();

  // Simuler la réception d'une notification
  const simulateNotification = () => {
    toast.push('success', 'Notification de test créée !');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Test des Notifications
        </h1>

        <div className="space-y-6">
          {/* Test Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              User ID (pour test)
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Entrez un user ID"
            />
          </div>

          {/* Test Button */}
          <div>
            <button
              onClick={simulateNotification}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Simuler une notification
            </button>
          </div>

          {/* Notifications Component */}
          {userId && (
            <div className="mt-8 p-4 border border-slate-200 rounded-lg">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Composant Notifications
              </h2>
              <Notifications userId={userId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
