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
        return <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
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
            <div key={i} className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
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
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <BellAlertIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg font-medium text-xs transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3.5 py-1.5 rounded-lg font-medium text-xs transition-all ${
              filter === 'unread'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <CheckIcon className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <BellIcon className="h-7 w-7 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-1">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
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
              className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                notification.read
                  ? 'bg-white dark:bg-gray-800/80 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                  : 'bg-blue-50 dark:bg-blue-900/15 border-blue-100 dark:border-blue-800/40 hover:bg-blue-100/50 dark:hover:bg-blue-900/25'
              }`}
            >
              <div className="flex gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  notification.read
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm font-semibold ${
                      notification.read
                        ? 'text-gray-800 dark:text-gray-200'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                    )}
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 text-xs mt-0.5">
                    {notification.message}
                  </p>

                  {notification.data?.guardName && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Verified by {notification.data.guardName}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1.5">
                    <ClockIcon className="h-3 w-3" />
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
