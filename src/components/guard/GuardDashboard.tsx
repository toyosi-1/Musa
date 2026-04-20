"use client";

import { useEffect, useRef, useState } from 'react';
import { User } from '@/types/user';
import { verifyAccessCode } from '@/services/accessCodeService';
import {
  getGuardVerificationHistory,
  getGuardActivityStats,
  logVerificationAttempt,
  VerificationRecord,
} from '@/services/guardActivityService';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { acknowledgeAlert } from '@/services/emergencyService';
import {
  syncEstateCodes,
  verifyCodeOffline,
  queuePendingEntry,
  syncPendingEntries,
  getPendingCount,
  getLastSyncTime,
} from '@/services/offlineGuardService';
import { useNetwork } from '@/hooks/useNetwork';
import { GuardWelcomeBanner } from './parts/GuardWelcomeBanner';
import { GuardStatsGrid } from './parts/GuardStatsGrid';
import { EmergencyAlertsList } from './parts/EmergencyAlertsList';
import { VerifyCodePanel, type VerifyScanResult } from './parts/VerifyCodePanel';
import { VerificationHistoryPanel } from './parts/VerificationHistoryPanel';
import { useEstate } from './parts/useEstate';
import { useEmergencyAlerts } from './parts/useEmergencyAlerts';

interface GuardDashboardProps {
  user: User;
}

const VERIFY_TIMEOUT_MS = 8_000;
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const ONLINE_SYNC_DEBOUNCE_MS = 2_000;

const DEFAULT_STATS = {
  totalVerifications: 0,
  validAccess: 0,
  deniedAccess: 0,
  todayVerifications: 0,
  successRate: 0,
  expiredCodes: 0,
  invalidCodes: 0,
  thisWeekVerifications: 0,
  thisMonthVerifications: 0,
  averagePerDay: 0,
};

export default function GuardDashboard({ user }: GuardDashboardProps) {
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<VerifyScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationHistory, setVerificationHistory] = useState<VerificationRecord[]>([]);
  const [activityStats, setActivityStats] = useState(DEFAULT_STATS);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const { online } = useNetwork();
  const estate = useEstate(user.estateId);
  const emergencyAlerts = useEmergencyAlerts(user.estateId);

  // ─── Offline sync on load + periodic ────────────────────────────────
  useEffect(() => {
    if (!user.estateId) return;

    const doSync = async () => {
      if (!navigator.onLine) return;
      try {
        await syncEstateCodes(user.estateId!);
        const synced = await syncPendingEntries(user.uid);
        if (synced > 0) console.log(`[Guard] Synced ${synced} pending offline entries`);
      } catch (e) {
        console.warn('[Guard] Background sync failed:', e);
      }
    };

    doSync();
    const interval = setInterval(doSync, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user.estateId, user.uid]);

  // ─── Flush pending entries when coming back online (debounced) ──────
  useEffect(() => {
    if (!online || !user.estateId) return;
    const timer = setTimeout(() => {
      syncPendingEntries(user.uid).catch(() => {
        /* handled by sync lock */
      });
    }, ONLINE_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [online, user.estateId, user.uid]);

  // ─── Initial focus + stats/history bootstrap ────────────────────────
  useEffect(() => {
    inputRef.current?.focus();

    const loadGuardData = async () => {
      setIsLoadingStats(true);
      try {
        const stats = await getGuardActivityStats(user.uid);
        setActivityStats(stats);

        try {
          const history = await getGuardVerificationHistory(user.uid, 10);
          setVerificationHistory(history);
        } catch (historyError) {
          // Fall back to an unordered fetch if the index is missing.
          console.warn('Using fallback method for guard history due to:', historyError);
          try {
            const db = await getFirebaseDatabase();
            const snapshot = await get(ref(db, `guardActivity/${user.uid}/verifications`));
            if (snapshot.exists()) {
              const records: VerificationRecord[] = Object.values(snapshot.val());
              const sorted = records.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
              setVerificationHistory(sorted);
            } else {
              setVerificationHistory([]);
            }
          } catch (fallbackError) {
            console.error('Fallback method also failed:', fallbackError);
            setVerificationHistory([]);
          }
        }
      } catch (error) {
        console.error('Error loading guard data:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadGuardData();
  }, [user.uid]);

  /** Online verify with 8s timeout, falling back to local cache on failure. */
  const runVerify = async (
    code: string,
  ): Promise<{ result: VerifyScanResult & { accessCodeId?: string }; offline: boolean }> => {
    if (!navigator.onLine) {
      return { result: verifyCodeOffline(code, user.estateId || ''), offline: true };
    }
    try {
      const verifyPromise = verifyAccessCode(code, {
        estateId: user.estateId,
        guardName: user.displayName || 'Security Guard',
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Verification timeout')), VERIFY_TIMEOUT_MS),
      );
      const result = await Promise.race([verifyPromise, timeoutPromise]);
      return { result, offline: false };
    } catch (networkErr) {
      console.warn('[Guard] Online verify failed, falling back to offline:', networkErr);
      return { result: verifyCodeOffline(code, user.estateId || ''), offline: true };
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || isProcessing) return;
    setIsProcessing(true);

    try {
      const { result, offline } = await runVerify(manualCode);
      setScanResult(result);

      // Log the attempt — either queue it (offline) or send to the server.
      if (offline) {
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
      } else {
        try {
          await logVerificationAttempt(user.uid, {
            code: manualCode,
            isValid: result.isValid,
            message: result.message,
            householdId: result.household?.id,
            destinationAddress: result.destinationAddress,
            accessCodeId: result.accessCodeId,
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
        }
      }

      // Refresh stats. Offline mode can only bump the local "today" counter.
      if (!offline) {
        try {
          const refreshed = await getGuardActivityStats(user.uid);
          setActivityStats(refreshed);
        } catch {
          setActivityStats((prev) => ({
            ...prev,
            totalVerifications: prev.totalVerifications + 1,
            validAccess: prev.validAccess + (result.isValid ? 1 : 0),
            deniedAccess: prev.deniedAccess + (result.isValid ? 0 : 1),
            todayVerifications: prev.todayVerifications + 1,
          }));
        }
      } else {
        setActivityStats((prev) => ({
          ...prev,
          todayVerifications: prev.todayVerifications + 1,
        }));
      }

      // Prepend to local history so the guard sees the event immediately.
      const newRecord: VerificationRecord = {
        id: `local-${Date.now()}`,
        timestamp: Date.now(),
        code: manualCode,
        guardId: user.uid,
        isValid: result.isValid,
        message: result.message,
        householdId: result.household?.id,
        destinationAddress: result.destinationAddress,
      };
      setVerificationHistory((prev) => [newRecord, ...prev.slice(0, 9)]);

      const displayTime = result.isValid && result.destinationAddress ? 10_000 : 5_000;
      setTimeout(() => {
        setScanResult(null);
        setManualCode('');
      }, displayTime);
    } catch (err) {
      console.error('Error verifying manual code:', err);
      setScanResult({
        isValid: false,
        message: 'Failed to verify code: ' + (err instanceof Error ? err.message : 'Unknown error'),
      });
      setTimeout(() => setScanResult(null), 5000);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (user.estateId) await acknowledgeAlert(user.estateId, alertId, user.uid);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <GuardWelcomeBanner
        firstName={user.displayName?.split(' ')[0] || 'Guard'}
        estateName={estate?.name}
        online={online}
        todayVerifications={activityStats.todayVerifications}
      />

      {!online && (
        <div className="mb-4 rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>No network — verification will use cached data</span>
        </div>
      )}

      <EmergencyAlertsList alerts={emergencyAlerts} onAcknowledge={handleAcknowledgeAlert} />

      <GuardStatsGrid stats={activityStats} loading={isLoadingStats} />

      <div className="grid md:grid-cols-5 gap-5 flex-grow overflow-y-auto pb-4">
        <div className="md:col-span-3 h-full flex flex-col">
          <VerifyCodePanel
            ref={inputRef}
            manualCode={manualCode}
            isProcessing={isProcessing}
            scanResult={scanResult}
            onChange={setManualCode}
            onSubmit={handleVerifyCode}
          />
        </div>

        <div className="md:col-span-2 h-full flex flex-col">
          <VerificationHistoryPanel records={verificationHistory} isLoading={isLoadingStats} />
        </div>
      </div>
    </div>
  );
}
