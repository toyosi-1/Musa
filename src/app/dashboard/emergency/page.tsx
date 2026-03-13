"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EmergencyType } from '@/types/user';
import { triggerEmergencyAlert, getActiveAlerts, getEmergencyTypeInfo } from '@/services/emergencyService';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const EMERGENCY_TYPES: { type: EmergencyType; label: string; icon: string; description: string }[] = [
  { type: 'robbery', label: 'Robbery / Break-in', icon: '🚨', description: 'Armed robbery, burglary, or break-in attempt' },
  { type: 'fire', label: 'Fire', icon: '🔥', description: 'Fire outbreak in or near your property' },
  { type: 'medical', label: 'Medical Emergency', icon: '🏥', description: 'Someone needs urgent medical attention' },
  { type: 'suspicious', label: 'Suspicious Activity', icon: '👁️', description: 'Suspicious person or activity observed' },
  { type: 'flood', label: 'Flood / Water', icon: '🌊', description: 'Flooding or serious water damage' },
  { type: 'other', label: 'Other', icon: '⚠️', description: 'Other emergency situation' },
];

export default function EmergencyPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [estateName, setEstateName] = useState('');

  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    loadContext();
  }, [currentUser]);

  const loadContext = async () => {
    if (!currentUser) return;
    try {
      const db = await getFirebaseDatabase();
      if (currentUser.householdId) {
        const hhSnap = await get(ref(db, `households/${currentUser.householdId}`));
        if (hhSnap.exists()) setHouseholdName(hhSnap.val().name || '');
      }
      if (currentUser.estateId) {
        const estSnap = await get(ref(db, `estates/${currentUser.estateId}`));
        if (estSnap.exists()) setEstateName(estSnap.val().name || '');
      }
    } catch (e) {
      console.error('Error loading context:', e);
    }
  };

  const handleSendAlert = async () => {
    if (!currentUser || !selectedType || !currentUser.estateId) return;

    setSending(true);
    setError('');
    try {
      await triggerEmergencyAlert({
        estateId: currentUser.estateId,
        triggeredBy: currentUser.uid,
        triggeredByName: currentUser.displayName || currentUser.email,
        householdId: currentUser.householdId,
        householdName: householdName,
        type: selectedType,
        description: description.trim() || undefined,
      });
      setSent(true);
    } catch (err) {
      console.error('Error triggering emergency:', err);
      setError('Failed to send emergency alert. Please try again or call emergency services directly.');
    } finally {
      setSending(false);
    }
  };

  if (!currentUser) return null;

  if (!currentUser.estateId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-5">
        <div className="max-w-lg mx-auto mt-20 text-center">
          <div className="text-6xl mb-4">🏘️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Estate Linked</h1>
          <p className="text-gray-500 dark:text-gray-400">You need to be part of an estate to use the emergency alert system.</p>
          <button onClick={() => router.back()} className="mt-6 px-6 py-2.5 bg-gray-200 dark:bg-gray-800 rounded-xl font-semibold text-gray-700 dark:text-gray-300">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-5 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alert Sent!</h1>
          <p className="text-gray-500 dark:text-gray-400">
            All guards and the estate admin have been notified. Stay safe and remain where you are if possible.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
            <p className="font-semibold mb-1">While you wait:</p>
            <ul className="text-left space-y-1 ml-4 list-disc">
              <li>Lock your doors if safe to do so</li>
              <li>Stay away from windows</li>
              <li>Call emergency services if needed: <strong>112</strong> or <strong>199</strong></li>
            </ul>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => router.push('/dashboard/resident')}
              className="px-6 py-2.5 bg-gray-200 dark:bg-gray-800 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-red-600 dark:bg-red-700 text-white px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold">Emergency Alert</h1>
            {estateName && <p className="text-xs text-red-100">{estateName}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Confirmation Step */}
        {confirmStep ? (
          <div className="space-y-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">Confirm Emergency Alert</h2>
              <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                This will immediately notify all estate guards and the admin. Please confirm this is a real emergency.
              </p>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Type:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {EMERGENCY_TYPES.find(t => t.type === selectedType)?.icon} {EMERGENCY_TYPES.find(t => t.type === selectedType)?.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">From:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{currentUser.displayName}</span>
                </div>
                {householdName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Household:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{householdName}</span>
                  </div>
                )}
                {description && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Details:</span>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{description}</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl p-4 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmStep(false)}
                disabled={sending}
                className="flex-1 py-3.5 rounded-2xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendAlert}
                disabled={sending}
                className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {sending ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    Sending...
                  </>
                ) : (
                  <>
                    🚨 SEND ALERT
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Select emergency type */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">What's the emergency?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select the type that best describes your situation.</p>

              <div className="grid grid-cols-2 gap-3">
                {EMERGENCY_TYPES.map(({ type, label, icon, description: desc }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                      selectedType === type
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{label}</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Optional description */}
            {selectedType && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Additional details <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Someone trying to break in through the back fence, near Block C..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm"
                />
              </div>
            )}

            {/* Step 3: Send button */}
            {selectedType && (
              <button
                onClick={() => setConfirmStep(true)}
                className="w-full py-4 rounded-2xl font-bold text-white text-lg bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Send Emergency Alert
              </button>
            )}

            {/* Emergency numbers */}
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">For life-threatening emergencies, call directly:</p>
              <div className="flex gap-4 justify-center">
                <a href="tel:112" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-gray-700 text-sm font-bold text-gray-900 dark:text-white shadow-sm">
                  📞 112
                </a>
                <a href="tel:199" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-gray-700 text-sm font-bold text-gray-900 dark:text-white shadow-sm">
                  🚒 199
                </a>
                <a href="tel:767" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-gray-700 text-sm font-bold text-gray-900 dark:text-white shadow-sm">
                  🚑 767
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
