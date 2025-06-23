"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import StatusGuard from '@/components/auth/StatusGuard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
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
      <div className="flex flex-col justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <StatusGuard requireStatus="approved" requireAdmin={true}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">System Settings</h1>
          <Link 
            href="/admin/dashboard" 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
        </div>
        
        {showSuccessMessage && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p>Settings saved successfully!</p>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold">Application Settings</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">Notifications</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Email Notifications
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Send notifications for approvals, rejections and guest entries
                  </p>
                </div>
                <div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.enableEmailNotifications}
                      onChange={(e) => handleSettingChange('enableEmailNotifications', e.target.checked)}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Require Phone Verification
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Users must verify their phone number during registration
                  </p>
                </div>
                <div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.requirePhoneVerification}
                      onChange={(e) => handleSettingChange('requirePhoneVerification', e.target.checked)}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">Access Codes</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Maximum Pending Codes
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Maximum number of active codes a resident can have
                  </p>
                </div>
                <div className="w-24">
                  <input 
                    type="number"
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={settings.maxPendingCodes}
                    onChange={(e) => handleSettingChange('maxPendingCodes', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Default Code Duration (Days)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    How long access codes remain valid by default
                  </p>
                </div>
                <div className="w-24">
                  <input 
                    type="number"
                    min="1"
                    max="30"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={settings.codeDurationDays}
                    onChange={(e) => handleSettingChange('codeDurationDays', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Allow Guest Codes
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Residents can generate temporary codes for guests
                  </p>
                </div>
                <div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.allowGuestCodes}
                      onChange={(e) => handleSettingChange('allowGuestCodes', e.target.checked)}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">System</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Maintenance Mode
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Only administrators can access the system when enabled
                  </p>
                </div>
                <div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.maintenanceMode}
                      onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isSaving 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSaving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </StatusGuard>
  );
}
