"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import StatusGuard from '@/components/auth/StatusGuard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageLoading from '@/components/ui/PageLoading';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

export default function AdminSettingsPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    enableEmailNotifications: true,
    requirePhoneVerification: false,
    maxPendingCodes: 5,
    codeDurationDays: 7,
    allowGuestCodes: true,
    maintenanceMode: false
  });
  
  useEffect(() => {
    // Only allow admins to access this page
    if (!loading && currentUser && currentUser.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [currentUser, loading, router]);
  
  const handleSettingChange = (setting: string, value: boolean | number) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };
  
  const handleSaveSettings = () => {
    setIsSaving(true);
    
    // Simulate API call to save settings
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccessMessage(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    }, 1000);
  };
  
  if (loading) {
    return (
      <PageLoading
        accent="gray"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      />
    );
  }

  const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <label className="inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <div className={`relative w-11 h-6 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
        disabled ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50' : 'bg-gray-200 dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:border-gray-300 dark:border-gray-600'
      }`} />
    </label>
  );
  
  return (
    <StatusGuard requireStatus="approved" requireAdmin={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center shadow-md shadow-gray-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">System Settings</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Super Admin &middot; Application configuration</p>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {showSuccessMessage && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Settings saved successfully!</p>
          </div>
        )}

        {/* Notifications Section */}
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Email Notifications</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Send notifications for approvals, rejections and guest entries</p>
              </div>
              <ToggleSwitch checked={settings.enableEmailNotifications} onChange={(v) => handleSettingChange('enableEmailNotifications', v)} />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Phone Verification</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Users must verify their phone number during registration</p>
              </div>
              <ToggleSwitch checked={settings.requirePhoneVerification} onChange={(v) => handleSettingChange('requirePhoneVerification', v)} />
            </div>
          </div>
        </div>

        {/* Access Codes Section */}
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
              <svg className="h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Access Codes</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Max Active Codes</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Maximum active codes a resident can have at once</p>
              </div>
              <input
                type="number"
                min="1"
                max="20"
                className="w-20 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={settings.maxPendingCodes}
                onChange={(e) => handleSettingChange('maxPendingCodes', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Default Duration (days)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">How long access codes remain valid by default</p>
              </div>
              <input
                type="number"
                min="1"
                max="30"
                className="w-20 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={settings.codeDurationDays}
                onChange={(e) => handleSettingChange('codeDurationDays', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Allow Guest Codes</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Residents can generate temporary codes for guests</p>
              </div>
              <ToggleSwitch checked={settings.allowGuestCodes} onChange={(v) => handleSettingChange('allowGuestCodes', v)} />
            </div>
          </div>
        </div>

        {/* System Section */}
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">System</h2>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Maintenance Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Only administrators can access the system when enabled</p>
              </div>
              <ToggleSwitch checked={settings.maintenanceMode} onChange={(v) => handleSettingChange('maintenanceMode', v)} />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </>
          )}
        </button>

      </div>
      </div>
    </StatusGuard>
  );
}
