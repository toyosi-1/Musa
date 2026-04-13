"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import ModernBanner from '@/components/ui/ModernBanner';
import { getHousehold } from '@/services/householdService';

export default function ProfilePage() {
  const { currentUser, signOut } = useAuth();
  const router = useRouter();

  const [householdName, setHouseholdName] = useState<string | null>(null);

  // Fetch household name
  useEffect(() => {
    if (currentUser?.householdId) {
      getHousehold(currentUser.householdId)
        .then((h) => setHouseholdName(h?.name || null))
        .catch(() => setHouseholdName(null));
    }
  }, [currentUser?.householdId]);

  // Notification settings state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [notifCodeScans, setNotifCodeScans] = useState(true);
  const [notifCommunity, setNotifCommunity] = useState(true);
  const [notifSecurity, setNotifSecurity] = useState(true);
  const [enablingPush, setEnablingPush] = useState(false);

  // Check push notification support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
      setPushEnabled(Notification.permission === 'granted');
    }

    // Load saved preferences from localStorage
    const savedPrefs = localStorage.getItem('musa_notif_prefs');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        setNotifCodeScans(prefs.codeScans ?? true);
        setNotifCommunity(prefs.community ?? true);
        setNotifSecurity(prefs.security ?? true);
      } catch {}
    }
  }, []);

  // Save preferences when they change
  const savePrefs = (codeScans: boolean, community: boolean, security: boolean) => {
    localStorage.setItem('musa_notif_prefs', JSON.stringify({ codeScans, community, security }));
  };

  const handleTogglePush = async () => {
    if (!pushSupported) return;

    if (pushEnabled) {
      // Already enabled — user wants to disable
      setPushEnabled(false);
      // Note: We can't revoke browser permission, but we can stop sending locally
      localStorage.setItem('musa_push_disabled', 'true');
      return;
    }

    // Request permission
    setEnablingPush(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        setPushEnabled(true);
        localStorage.removeItem('musa_push_disabled');

        // Show a test notification
        new Notification('Musa Notifications Enabled', {
          body: 'You will now receive alerts when your access codes are scanned.',
          icon: '/images/icon-192x192.png',
        });
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    } finally {
      setEnablingPush(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <UserCircleIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Profile</h1>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Account & preferences</p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 px-6 pt-8 pb-6 text-center">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full blur-sm" />
          <div className="absolute left-1/4 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-md" />
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3 ring-2 ring-white/25 shadow-lg">
              {currentUser.displayName?.charAt(0) || 'U'}
            </div>
            <h2 className="text-lg font-bold text-white">{currentUser.displayName}</h2>
            <p className="text-white/60 text-xs mt-0.5">{currentUser.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-white/15 backdrop-blur-sm text-white/90 rounded-full text-[11px] font-semibold">
              {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
            </span>
          </div>
        </div>
        
        <div className="p-4 space-y-0 divide-y divide-gray-100 dark:divide-gray-800">
          <div className="flex justify-between py-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Account ID</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{currentUser.uid.slice(0, 8)}...</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
            <span className={`text-sm font-semibold ${
              currentUser.status === 'approved' 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : currentUser.status === 'pending' 
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
            }`}>
              {currentUser.status.charAt(0).toUpperCase() + currentUser.status.slice(1)}
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Email Verified</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {currentUser.isEmailVerified ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Joined</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {new Date(currentUser.createdAt).toLocaleDateString()}
            </span>
          </div>
          {householdName && (
            <div className="flex justify-between py-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Household</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                {householdName}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
        </div>
        <div className="p-4">

          <div className="space-y-4">
            {/* Push Notification Master Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Push Notifications</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {!pushSupported
                    ? 'Not supported on this browser'
                    : pushPermission === 'denied'
                    ? 'Blocked — enable in browser settings'
                    : pushEnabled
                    ? 'Receiving notifications'
                    : 'Tap to enable'}
                </p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={pushEnabled}
                  disabled={!pushSupported || pushPermission === 'denied' || enablingPush}
                  onChange={handleTogglePush}
                />
                <div className={`relative w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${
                  !pushSupported || pushPermission === 'denied'
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-gray-200 dark:bg-gray-700 peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800'
                }`}></div>
              </label>
            </div>

            {/* Notification Categories */}
            <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Access Code Alerts</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">When your codes are scanned at the gate</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notifCodeScans}
                  onChange={(e) => {
                    setNotifCodeScans(e.target.checked);
                    savePrefs(e.target.checked, notifCommunity, notifSecurity);
                  }}
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Community Updates</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">New posts and announcements in the feed</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notifCommunity}
                  onChange={(e) => {
                    setNotifCommunity(e.target.checked);
                    savePrefs(notifCodeScans, e.target.checked, notifSecurity);
                  }}
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Security Alerts</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Account activity and security notices</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notifSecurity}
                  onChange={(e) => {
                    setNotifSecurity(e.target.checked);
                    savePrefs(notifCodeScans, notifCommunity, e.target.checked);
                  }}
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <button 
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/15 dark:hover:bg-red-900/25 text-red-600 dark:text-red-400 font-semibold py-3 px-4 rounded-2xl border border-red-100 dark:border-red-900/30 transition-colors text-sm"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Sign Out
      </button>
    </div>
  );
}
