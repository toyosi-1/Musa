"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get, update } from 'firebase/database';
import { BellIcon, CheckIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: {
    accessCodeId?: string;
    guestName?: string;
    guardName?: string;
    address?: string;
  };
}

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, [currentUser]);

  const loadNotifications = async () => {
    if (!currentUser?.uid) return;

    try {
      const db = await getFirebaseDatabase();
      const notificationsRef = ref(db, `notifications/${currentUser.uid}`);
      const snapshot = await get(notificationsRef);

      if (snapshot.exists()) {
        const notifData = snapshot.val();
        const notifArray: Notification[] = Object.entries(notifData).map(([key, value]: [string, any]) => ({
          id: key,
          ...value
        }));
        
        // Sort by timestamp descending
        notifArray.sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(notifArray);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!currentUser?.uid) return;

    try {
      const db = await getFirebaseDatabase();
      const notifRef = ref(db, `notifications/${currentUser.uid}/${notificationId}`);
      await update(notifRef, { read: true });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser?.uid) return;

    try {
      const db = await getFirebaseDatabase();
      const updates: { [key: string]: any } = {};
      
      notifications.forEach(notif => {
        if (!notif.read) {
          updates[`notifications/${currentUser.uid}/${notif.id}/read`] = true;
        }
      });

      await update(ref(db), updates);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'guest-checkin':
        return <UserGroupIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />;
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="card bg-white dark:bg-gray-800 p-4">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header with gradient banner */}
      <div className="relative mb-6 -mx-4 px-4 py-8 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 dark:from-primary-600 dark:via-primary-700 dark:to-primary-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <BellAlertIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Notifications</h1>
                <p className="text-primary-100 text-sm">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === 'all'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === 'unread'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          >
            <CheckIcon className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="card bg-white dark:bg-gray-800 p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <BellIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'unread' 
                ? "You're all caught up! Check back later for new updates."
                : "You'll see notifications here when guests check in or other events occur."}
            </p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => !notification.read && markAsRead(notification.id)}
              className={`card p-4 transition-all cursor-pointer group ${
                notification.read
                  ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                  : 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/30'
              }`}
            >
              <div className="flex gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  notification.read
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : 'bg-primary-100 dark:bg-primary-900/40'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`font-semibold ${
                      notification.read
                        ? 'text-gray-800 dark:text-gray-200'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500"></div>
                    )}
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
                    {notification.message}
                  </p>

                  {notification.data?.guardName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Verified by {notification.data.guardName}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <ClockIcon className="h-3.5 w-3.5" />
                    <span>{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
