import { useEffect, useState, useCallback, useRef } from 'react';
import { websocketService } from '../lib/websocket';
import { apiFetch } from '../lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null; // ✅ Ajout du champ readAt
  metadata?: any;
}

export function useWebSocket(token: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const notificationsRef = useRef(notifications);
  const tokenRef = useRef(token);
  
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // ✅ Reset complet quand le user change (token différent)
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
      setLoading(false);
      setError(null);
      websocketService.disconnect();
      return;
    }

    // Si le token précédent était null ou différent, reset tout avant de recharger
    if (tokenRef.current !== token) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(true);
      setError(null);
    }
  }, [token]);

  // ✅ Phase 1 : Charger l'historique depuis l'API
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const loadNotifications = async () => {
      try {
        const res = await apiFetch(`${API_URL}/notifications`);
        
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        } else {
          console.error('[useWebSocket] Erreur HTTP:', res.status);
          setError(`Erreur de chargement: ${res.status}`);
        }
      } catch (err: any) {
        console.error('[useWebSocket] Erreur de chargement:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [token]);

  // ✅ Phase 2 : Connecter au WebSocket pour le temps réel
  useEffect(() => {
    if (!token) {
      websocketService.disconnect();
      setIsConnected(false);
      return;
    }

    websocketService.connect(token);

    // ✅ S'abonner à l'état de connexion
    const unsubscribe = websocketService.subscribeConnection((connected) => {
      setIsConnected(connected);
    });

    // Handlers
    const handleAuthenticated = (data: any) => {
      // Authentification réussie
    };

    const handleError = (error: any) => {
      const errorDetails = {
        message: error?.message || 'Unknown error',
        code: error?.code,
        type: error?.type,
      };
      
      console.error('[useWebSocket] Erreur WebSocket:', errorDetails);
      
      // Si erreur d'auth, se déconnecter
      if (
        error?.code === 'INVALID_SIGNATURE' || 
        error?.code === 'TOKEN_EXPIRED' ||
        error?.code === 'INVALID_TOKEN'
      ) {
        console.error('[useWebSocket] Erreur d\'authentification - déconnexion');
        setIsConnected(false);
      }
    };

    // ✅ Recevoir une nouvelle notification en temps réel
    const handleNotification = (notification: Notification) => {
      setNotifications((prev) => {
        // Éviter les doublons basé sur l'ID
        if (prev.some((n) => n.id === notification.id)) {
          return prev;
        }
        // ✅ Insérer au début pour les plus récentes en premier
        return [notification, ...prev];
      });
      
      if (!notification.isRead) {
        setUnreadCount(prev => prev + 1);
      }

      // ✅ Notification visuelle du navigateur (optionnel)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/notification-icon.png',
        });
      }
    };

    const handleMarkedRead = (data: { notificationId?: string; id?: string }) => {
      const id = data.notificationId ?? data.id;
      if (!id) return;

      let shouldDecrement = false;

      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id === id && !n.isRead) {
            shouldDecrement = true;
            return { ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() };
          }
          return n;
        })
      );

      if (shouldDecrement) setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleDeleted = (data: { notificationId?: string; id?: string }) => {
      const id = data.notificationId ?? data.id;
      if (!id) return;

      let wasUnread = false;

      setNotifications((prev) => {
        const deleted = prev.find((n) => n.id === id);
        if (deleted && !deleted.isRead) {
          wasUnread = true;
        }
        return prev.filter((n) => n.id !== id);
      });

      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    };

    const handleAllRead = (data: { count: number }) => {
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    };

    const handleNotificationCount = (count: number) => {
      setUnreadCount(count);
    };

    // Enregistrer les listeners
    websocketService.on('authenticated', handleAuthenticated);
    websocketService.on('error', handleError);
    websocketService.on('notification:new', handleNotification);
    websocketService.on('notification:marked-read', handleMarkedRead);
    websocketService.on('notification:deleted', handleDeleted);
    websocketService.on('notifications:all-read', handleAllRead);
    websocketService.on('notifications:count', handleNotificationCount);

    return () => {
      unsubscribe();
      websocketService.off('authenticated', handleAuthenticated);
      websocketService.off('error', handleError);
      websocketService.off('notification:new', handleNotification);
      websocketService.off('notification:marked-read', handleMarkedRead);
      websocketService.off('notification:deleted', handleDeleted);
      websocketService.off('notifications:all-read', handleAllRead);
      websocketService.off('notifications:count', handleNotificationCount);
    };
  }, [token]);

  // ✅ Marquer comme lu (appelle l'API + optimistic update)
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // --- optimistic update ---
      const wasUnread = notificationsRef.current.some(
        (n) => n.id === notificationId && !n.isRead
      );

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() }
            : n
        )
      );

      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      // --- API call ---
      const res = await apiFetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
      });

      if (!res.ok) {
        console.error('[useWebSocket] Erreur mark-read:', res.status);
      }
    } catch (err) {
      console.error('[useWebSocket] Erreur mark-read:', err);
    }
  }, [apiFetch, setNotifications, setUnreadCount]);

  // ✅ Marquer toutes comme lues (appelle l'API)
  const markAllAsRead = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
      });

      if (!res.ok) {
        console.error('[useWebSocket] Erreur mark-all-read:', res.status);
      }
      
      // Le WebSocket mettra à jour via 'notifications:all-read'
    } catch (err) {
      console.error('[useWebSocket] Erreur mark-all-read:', err);
    }
  }, []);

  // ✅ Supprimer (appelle l'API + optimistic update)
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      // --- optimistic update ---
      const deleted = notificationsRef.current.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      if (deleted && !deleted.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      // --- API call ---
      const res = await apiFetch(`${API_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        console.error('[useWebSocket] Erreur delete:', res.status);
      }
    } catch (err) {
      console.error('[useWebSocket] Erreur delete:', err);
    }
  }, [apiFetch, setNotifications, setUnreadCount]);

  // ✅ Recharger les notifications (manuel)
  const reload = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      
      const res = await apiFetch(`${API_URL}/notifications`);
      
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('[useWebSocket] Erreur reload:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    isConnected,
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    reload,
  };
}
