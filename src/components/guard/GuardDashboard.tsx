"use client";

import { useState, useEffect, useRef } from 'react';
import { User, Household, Estate, EmergencyAlert } from '@/types/user';
import { verifyAccessCode } from '@/services/accessCodeService';
import { MapPinIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { getGuardVerificationHistory, getGuardActivityStats, logVerificationAttempt, VerificationRecord } from '@/services/guardActivityService';
import { format, formatDistanceToNow } from 'date-fns';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { WelcomeBanner } from '@/components/ui/ModernBanner';
import { StatCard } from '@/components/ui/ProfessionalCard';
import { subscribeToAlerts, acknowledgeAlert, getEmergencyTypeInfo } from '@/services/emergencyService';
import { syncEstateCodes, verifyCodeOffline, queuePendingEntry, syncPendingEntries, getPendingCount, getLastSyncTime } from '@/services/offlineGuardService';
import { useNetwork } from '@/hooks/useNetwork';

interface GuardDashboardProps {
  user: User;
}

export default function GuardDashboard({ user }: GuardDashboardProps) {
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<{ 
    isValid: boolean; 
    message?: string;
    household?: Household;
    destinationAddress?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationHistory, setVerificationHistory] = useState<VerificationRecord[]>([]);
  const [activityStats, setActivityStats] = useState({
    totalVerifications: 0,
    validAccess: 0,
    deniedAccess: 0,
    todayVerifications: 0,
    successRate: 0,
    expiredCodes: 0,
    invalidCodes: 0,
    thisWeekVerifications: 0,
    thisMonthVerifications: 0,
    averagePerDay: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [estate, setEstate] = useState<Estate | null>(null);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Offline mode state
  const { online, quality } = useNetwork();
  const [offlineSyncCount, setOfflineSyncCount] = useState<number | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load estate data
  useEffect(() => {
    const loadEstate = async () => {
      if (!user.estateId) return;
      
      try {
        const db = await getFirebaseDatabase();
        const estateRef = ref(db, `estates/${user.estateId}`);
        const snapshot = await get(estateRef);
        if (snapshot.exists()) {
          setEstate(snapshot.val() as Estate);
        }
      } catch (error) {
        console.error('Error loading estate:', error);
      }
    };
    
    loadEstate();
  }, [user.estateId]);

  // Subscribe to real-time emergency alerts
  useEffect(() => {
    if (!user.estateId) return;

    const unsubscribe = subscribeToAlerts(user.estateId, (alerts) => {
      const activeAlerts = alerts.filter(a => a.status === 'active');
      setEmergencyAlerts(activeAlerts);

      // Play alert sound for new active alerts
      if (activeAlerts.length > 0 && typeof window !== 'undefined') {
        try {
          // Use Web Audio API for alert sound
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.frequency.value = 880;
          oscillator.type = 'square';
          gainNode.gain.value = 0.3;
          oscillator.start();
          setTimeout(() => { oscillator.stop(); audioCtx.close(); }, 300);
        } catch (e) {
          // Audio may be blocked by browser policy
        }
      }
    });

    return () => unsubscribe();
  }, [user.estateId]);

  // ─── Offline Sync: download estate codes on load + periodically ───
  useEffect(() => {
    if (!user.estateId) return;

    // Update cached sync time
    setLastSync(getLastSyncTime(user.estateId));
    setPendingCount(getPendingCount());

    const doSync = async () => {
      if (!navigator.onLine) return;
      setIsSyncing(true);
      try {
        const count = await syncEstateCodes(user.estateId!);
        if (count >= 0) {
          setOfflineSyncCount(count);
          setLastSync(Date.now());
        }
        // Also sync any pending offline entries
        const synced = await syncPendingEntries(user.uid);
        if (synced > 0) console.log(`[Guard] Synced ${synced} pending offline entries`);
        setPendingCount(getPendingCount());
      } catch (e) {
        console.warn('[Guard] Background sync failed:', e);
      } finally {
        setIsSyncing(false);
      }
    };

    doSync(); // initial sync
    const interval = setInterval(doSync, 5 * 60 * 1000); // re-sync every 5 min
    return () => clearInterval(interval);
  }, [user.estateId, user.uid]);

  // When coming back online, sync pending entries
  useEffect(() => {
    if (online && user.estateId) {
      syncPendingEntries(user.uid).then(() => setPendingCount(getPendingCount()));
      syncEstateCodes(user.estateId).then(count => {
        if (count >= 0) { setOfflineSyncCount(count); setLastSync(Date.now()); }
      });
    }
  }, [online, user.estateId, user.uid]);

  // Handle manual code verification — with offline fallback
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualCode.trim() || isProcessing) return;
    setIsProcessing(true);
    console.log('Verifying manual code:', manualCode);
    
    let result: { isValid: boolean; message?: string; household?: any; destinationAddress?: string; accessCodeId?: string };
    let wasOffline = false;

    try {
      if (!navigator.onLine) {
        // ─── OFFLINE: verify against local cache ───
        console.log('[Guard] Offline — using local verification');
        const offlineResult = verifyCodeOffline(manualCode, user.estateId || '');
        result = offlineResult;
        wasOffline = true;
      } else {
        // ─── ONLINE: normal server verification ───
        try {
          result = await verifyAccessCode(manualCode, { 
            estateId: user.estateId,
            guardName: user.displayName || 'Security Guard'
          });
        } catch (networkErr) {
          // Network request failed — fall back to offline
          console.warn('[Guard] Online verify failed, falling back to offline:', networkErr);
          const offlineResult = verifyCodeOffline(manualCode, user.estateId || '');
          result = offlineResult;
          wasOffline = true;
        }
      }

      setScanResult(result);
      
      // Log verification — online or queue for later
      if (wasOffline) {
        queuePendingEntry({
          timestamp: Date.now(),
          code: manualCode,
          isValid: result.isValid,
          message: result.message,
          guardId: user.uid,
          householdId: result.household?.id,
          destinationAddress: result.destinationAddress,
          accessCodeId: result.accessCodeId,
        });
        setPendingCount(getPendingCount());
      } else {
        try {
          await logVerificationAttempt(user.uid, {
            code: manualCode,
            isValid: result.isValid,
            message: result.message,
            householdId: result.household?.id,
            destinationAddress: result.destinationAddress,
            accessCodeId: result.accessCodeId
          });
        } catch (logError) {
          console.error('Failed to log verification, queuing offline:', logError);
          queuePendingEntry({
            timestamp: Date.now(),
            code: manualCode,
            isValid: result.isValid,
            message: result.message,
            guardId: user.uid,
            householdId: result.household?.id,
            destinationAddress: result.destinationAddress,
            accessCodeId: result.accessCodeId,
          });
          setPendingCount(getPendingCount());
        }
      }
      
      // Refresh stats (skip if offline)
      if (!wasOffline) {
        try {
          const updatedStats = await getGuardActivityStats(user.uid);
          setActivityStats(updatedStats);
        } catch (statsError) {
          setActivityStats(prev => ({
            ...prev,
            totalVerifications: prev.totalVerifications + 1,
            validAccess: prev.validAccess + (result.isValid ? 1 : 0),
            deniedAccess: prev.deniedAccess + (result.isValid ? 0 : 1),
            todayVerifications: prev.todayVerifications + 1
          }));
        }
      } else {
        // Local stats update for offline
        setActivityStats(prev => ({
          ...prev,
          totalVerifications: prev.totalVerifications + 1,
          validAccess: prev.validAccess + (result.isValid ? 1 : 0),
          deniedAccess: prev.deniedAccess + (result.isValid ? 0 : 1),
          todayVerifications: prev.todayVerifications + 1
        }));
      }
      
      // Add to local verification history
      const newRecord: VerificationRecord = {
        id: `local-${Date.now()}`,
        timestamp: Date.now(),
        code: manualCode,
        guardId: user.uid,
        isValid: result.isValid,
        message: result.message,
        householdId: result.household?.id,
        destinationAddress: result.destinationAddress
      };
      setVerificationHistory(prev => [newRecord, ...prev.slice(0, 9)]);
      
      const displayTime = result.isValid && result.destinationAddress ? 10000 : 5000;
      setTimeout(() => {
        setScanResult(null);
        setManualCode('');
      }, displayTime);
    } catch (err) {
      console.error('Error verifying manual code:', err);
      setScanResult({ 
        isValid: false, 
        message: 'Failed to verify code: ' + (err instanceof Error ? err.message : 'Unknown error')
      });
      setTimeout(() => { setScanResult(null); }, 5000);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  // Focus input on mount and load guard stats
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Load guard stats and verification history
    const loadGuardData = async () => {
      setIsLoadingStats(true);
      try {
        console.log('Loading guard data for user:', user.uid);
        
        // Fetch guard activity stats
        const stats = await getGuardActivityStats(user.uid);
        console.log('Loaded guard stats:', stats);
        setActivityStats(stats);
        
        // Try to fetch verification history
        try {
          const history = await getGuardVerificationHistory(user.uid, 10);
          console.log('Loaded verification history:', history.length, 'records');
          setVerificationHistory(history);
        } catch (historyError) {
          // Handle the missing index error with a manual fallback
          console.warn('Using fallback method for guard history due to:', historyError);
          
          try {
            const db = await import('@/lib/firebase').then(m => m.getFirebaseDatabase());
            const { ref, get } = await import('firebase/database');
            
            // Direct fetch without ordering (bypassing the need for an index)
            const verificationRef = ref(db, `guardActivity/${user.uid}/verifications`);
            const snapshot = await get(verificationRef);
            
            if (snapshot.exists()) {
              // Process and sort the data manually
              const records: VerificationRecord[] = Object.values(snapshot.val());
              const sortedRecords = records.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
              console.log('Fallback loaded verification history:', sortedRecords.length, 'records');
              setVerificationHistory(sortedRecords);
            } else {
              console.log('No verification history found with fallback method');
              setVerificationHistory([]);
            }
          } catch (fallbackError) {
            console.error('Fallback method also failed:', fallbackError);
            setVerificationHistory([]);
          }
        }
        
        // Log current statistics for debugging
        console.log('Current activity stats:', {
          total: stats.totalVerifications,
          valid: stats.validAccess,
          denied: stats.deniedAccess,
          today: stats.todayVerifications,
          successRate: stats.successRate
        });
      } catch (error) {
        console.error('Error loading guard data:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    loadGuardData();
  }, [user.uid]);

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {/* ─── Guard Welcome Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 shadow-lg">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-sm" />
        <div className="absolute left-1/3 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-md" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70 mb-0.5">
                {estate?.name || 'Estate Security'}
              </p>
              <h1 className="text-2xl font-bold text-white">
                {user.displayName?.split(' ')[0] || 'Guard'}
              </h1>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${online ? 'bg-white/15 text-white' : 'bg-amber-400/20 text-amber-200'}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${online ? 'bg-emerald-300' : 'bg-amber-400 animate-pulse'}`} />
              {online ? 'Online' : 'Offline Mode'}
            </div>
            <div className="px-3 py-1 rounded-full bg-white/15 text-xs font-medium text-white">
              {activityStats.todayVerifications} checks today
            </div>
          </div>
        </div>
      </div>

      {/* ─── Offline Sync Status ─── */}
      {(!online || pendingCount > 0 || offlineSyncCount !== null) && (
        <div className={`mb-4 rounded-xl p-3 flex items-center justify-between text-xs font-medium ${
          !online 
            ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300'
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            {!online ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Offline Mode — verifying from {offlineSyncCount ?? 0} cached codes</span>
              </>
            ) : isSyncing ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Syncing codes...</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{offlineSyncCount ?? 0} codes cached for offline use</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded-full text-amber-800 dark:text-amber-200">
                {pendingCount} pending
              </span>
            )}
            {lastSync && (
              <span className="text-gray-400 dark:text-gray-500">
                Synced {Math.round((Date.now() - lastSync) / 60000)}m ago
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── Emergency Alert Banner ─── */}
      {emergencyAlerts.length > 0 && (
        <div className="mb-6 space-y-3 animate-pulse-slow">
          {emergencyAlerts.map((alert) => {
            const typeInfo = getEmergencyTypeInfo(alert.type);
            const timeAgo = formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true });
            return (
              <div
                key={alert.id}
                className="bg-red-50 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-600 rounded-2xl p-4 shadow-lg shadow-red-500/10"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <span className="text-xl">{typeInfo.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">
                        🚨 Emergency Alert
                      </span>
                      <span className="text-xs text-red-500 dark:text-red-400">{timeAgo}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {typeInfo.label}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      From: <strong>{alert.triggeredByName}</strong>
                      {alert.householdName ? ` • ${alert.householdName}` : ''}
                    </p>
                    {alert.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                        &ldquo;{alert.description}&rdquo;
                      </p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (user.estateId) {
                        await acknowledgeAlert(user.estateId, alert.id, user.uid);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex-shrink-0"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* ─── Security Statistics ─── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">Statistics</h2>
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
            <p className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
              {isLoadingStats ? '-' : activityStats.todayVerifications}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Today</p>
          </div>
          <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
            <p className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
              {isLoadingStats ? '-' : activityStats.totalVerifications}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Total</p>
          </div>
          <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
            <p className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {isLoadingStats ? '-' : activityStats.validAccess}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Granted</p>
          </div>
          <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
            <p className="text-lg md:text-xl font-bold text-red-500 dark:text-red-400">
              {isLoadingStats ? '-' : activityStats.deniedAccess}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Denied</p>
          </div>
        </div>
        {/* Success Rate Pill */}
        <div className="flex justify-center mt-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {isLoadingStats ? '...' : `${activityStats.successRate}%`}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">success rate</span>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-5 gap-5 flex-grow overflow-y-auto pb-4">
        {/* Left Column - Access Code Verification */}
        <div className="md:col-span-3 h-full flex flex-col">
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex-grow flex flex-col">
        {/* Manual Code Entry Section */}
        <div className="p-5 md:p-8">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Verify Access Code</h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Enter or scan a visitor's code</p>
            </div>
          </div>
          <form onSubmit={handleVerifyCode} className="space-y-4 max-w-md mx-auto">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="e.g. MUSA1234"
                aria-label="Access code input"
                className="block w-full text-center text-2xl font-bold font-mono tracking-[0.2em] py-5 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 rounded-2xl transition-all duration-200 placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:tracking-[0.15em] placeholder:font-medium placeholder:text-lg"
                disabled={isProcessing}
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={10}
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-4 text-base font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25"
              disabled={!manualCode || isProcessing}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-5 w-5" />
                  Verify Code
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500">or</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Scan QR Code Button */}
            <a
              href="/dashboard/scan"
              className="w-full py-4 text-base font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-lg shadow-teal-500/25"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan QR Code
            </a>
          </form>
        </div>
        
        {/* Verification Result */}
        {scanResult && (
          <div 
            className={`p-8 md:p-10 text-center animate-fade-in transition-all duration-300 ${
              scanResult.isValid 
                ? 'bg-success-50 dark:bg-success-900/20 border-t border-success-200 dark:border-success-700' 
                : 'bg-danger-50 dark:bg-danger-900/20 border-t border-danger-200 dark:border-danger-700'
            }`}
          >
            <div className={`w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center ${
              scanResult.isValid 
                ? 'bg-success text-white' 
                : 'bg-danger text-white'
            }`}>
              {scanResult.isValid ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              )}
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${
              scanResult.isValid 
                ? 'text-success-700 dark:text-success-400' 
                : 'text-danger-700 dark:text-danger-400'
            }`}>
              {scanResult.isValid ? 'Access Granted' : 'Access Denied'}
            </h3>
            {scanResult.message && (
              <p className={`mb-2 ${
                scanResult.isValid 
                  ? 'text-success-600 dark:text-success-300' 
                  : 'text-danger-600 dark:text-danger-300'
              }`}>
                {scanResult.message}
              </p>
            )}
            
            {/* Show destination address if available */}
            {scanResult.isValid && scanResult.destinationAddress && (
              <div className="mt-6 pt-5 border-t border-success-200 dark:border-success-700/50 text-left max-w-md mx-auto">
                <div className="flex items-start bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-success-100 dark:border-success-800/30">
                  <div className="w-10 h-10 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <MapPinIcon className="h-6 w-6 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-gray-800 dark:text-white">Going to:</p>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{scanResult.destinationAddress}</p>
                    {scanResult.household?.name && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Resident: {scanResult.household.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

        {/* Right Column - Enhanced Verification History */}
        <div className="md:col-span-2 h-full flex flex-col">
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex-grow flex flex-col">
            <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <ClockIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Security Log</h2>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{verificationHistory.length} recent entries</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto">
              {verificationHistory.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {verificationHistory.map((record: VerificationRecord, index) => (
                    <div key={record.id} className="p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                      <div className="flex items-start gap-3 md:gap-4">
                        {/* Status Icon */}
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                          record.isValid 
                            ? 'bg-success-100 dark:bg-success-900/30' 
                            : record.message?.toLowerCase().includes('expired')
                              ? 'bg-orange-100 dark:bg-orange-900/30'
                              : 'bg-danger-100 dark:bg-danger-900/30'
                        }`}>
                          {record.isValid ? (
                            <CheckCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-success" />
                          ) : record.message?.toLowerCase().includes('expired') ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12,6 12,12 16,14" />
                            </svg>
                          ) : (
                            <XCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-danger" />
                          )}
                        </div>
                        
                        {/* Record Details */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-grow min-w-0">
                              {/* Code and Status */}
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-mono text-sm md:text-base font-semibold text-gray-800 dark:text-white truncate">
                                  {record.code.length > 8 ? `${record.code.substring(0, 8)}...` : record.code}
                                </p>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  record.isValid 
                                    ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
                                    : record.message?.toLowerCase().includes('expired')
                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                      : 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400'
                                }`}>
                                  {record.isValid ? 'GRANTED' : record.message?.toLowerCase().includes('expired') ? 'EXPIRED' : 'DENIED'}
                                </span>
                              </div>
                              
                              {/* Message */}
                              {record.message && (
                                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                                  {record.message}
                                </p>
                              )}
                              
                              {/* Destination Address */}
                              {record.destinationAddress && (
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 mb-2">
                                  <p className="text-xs text-gray-500 dark:text-gray-300 mb-1 flex items-center gap-1">
                                    <MapPinIcon className="h-3 w-3" />
                                    Destination:
                                  </p>
                                  <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 font-medium">
                                    {record.destinationAddress.split('\n')[0]}
                                    {record.destinationAddress.includes('\n') && (
                                      <span className="text-gray-500 dark:text-gray-300"> (+more)</span>
                                    )}
                                  </p>
                                </div>
                              )}
                              
                              {/* Timestamp */}
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300">
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                                </span>
                                <span className="hidden sm:inline">
                                  {format(new Date(record.timestamp), 'MMM d, HH:mm')}
                                </span>
                              </div>
                            </div>
                            
                            {/* Entry Number */}
                            <div className="text-right flex-shrink-0">
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                                {index + 1}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-3">
                    <ClockIcon className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
                    {isLoadingStats ? 'Loading...' : 'No recent activity'}
                  </p>
                  <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                    {isLoadingStats ? '' : 'Verification records will appear here'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
