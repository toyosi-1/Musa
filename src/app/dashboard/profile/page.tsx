"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

export default function ProfilePage() {
  const { currentUser, signOut } = useAuth();
  const router = useRouter();

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
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => router.back()} 
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          <span className="font-medium text-sm">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Your Profile</h1>
        <div className="w-16" />
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
        {/* Profile header with avatar */}
        <div className="bg-blue-500 text-white p-6 text-center">
          <div className="w-24 h-24 rounded-full bg-white text-blue-500 flex items-center justify-center text-3xl font-bold mx-auto mb-4">
            {currentUser.displayName?.charAt(0) || 'U'}
          </div>
          <h2 className="text-xl font-bold">{currentUser.displayName}</h2>
          <p className="opacity-90">{currentUser.email}</p>
          <div className="mt-2">
            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm">
              {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
            </span>
          </div>
        </div>
        
        {/* Profile details */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white">Account Information</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Account ID</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{currentUser.uid.slice(0, 8)}...</span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <span className={`font-medium ${
                currentUser.status === 'approved' 
                  ? 'text-green-600 dark:text-green-400' 
                  : currentUser.status === 'pending' 
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
              }`}>
                {currentUser.status.charAt(0).toUpperCase() + currentUser.status.slice(1)}
              </span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Email Verified</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {currentUser.isEmailVerified ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Joined</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {new Date(currentUser.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Notifications
          </h3>

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

      {/* Actions */}
      <div className="space-y-3">
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold py-3 px-4 rounded-xl border border-red-200 dark:border-red-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}
