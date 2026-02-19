'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';
import { Bell, Check, Trash2, Clock } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'NEW_ASSIGNMENT' | 'NEW_GRADE' | 'DEADLINE_REMINDER' | 'ANNOUNCEMENT' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  assignment?: {
    id: string;
    title: string;
    course?: {
      title: string;
    };
  };
}

interface NotificationsProps {
  userId: string;
}

export default function Notifications({ userId }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/notifications', {
        headers: {
          'x-user-id': userId,
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
      } else {
        toast.push('error', 'Erreur lors du chargement des notifications');
      }
    } catch (error) {
      console.error('Notifications error:', error);
      toast.push('error', 'Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ id: notificationId }),
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Mark as read error:', error);
      toast.push('error', 'Erreur lors du marquage comme lu');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_ASSIGNMENT':
        return <div className="p-2 bg-blue-100 rounded-lg"><Bell className="w-4 h-4 text-blue-600" /></div>;
      case 'NEW_GRADE':
        return <div className="p-2 bg-green-100 rounded-lg"><Check className="w-4 h-4 text-green-600" /></div>;
      case 'DEADLINE_REMINDER':
        return <div className="p-2 bg-orange-100 rounded-lg"><Clock className="w-4 h-4 text-orange-600" /></div>;
      case 'ANNOUNCEMENT':
        return <div className="p-2 bg-purple-100 rounded-lg"><Bell className="w-4 h-4 text-purple-600" /></div>;
      default:
        return <div className="p-2 bg-slate-100 rounded-lg"><Bell className="w-4 h-4 text-slate-600" /></div>;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    // Mark all as read logic here
                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    setUnreadCount(0);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                Aucune notification
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-slate-900 text-sm">
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Marquer comme lu
                          </button>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm mt-1">
                        {notification.message}
                      </p>
                      {notification.assignment && (
                        <div className="text-xs text-slate-500 mt-2">
                          Cours: {notification.assignment.course?.title}
                        </div>
                      )}
                      <div className="text-xs text-slate-400 mt-2">
                        {formatTime(notification.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
