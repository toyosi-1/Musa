"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { getUserNotifications, NotificationData } from '@/services/notificationService';
import { getGuardVerificationHistory, VerificationRecord } from '@/services/guardActivityService';
import { getHouseholdActivity, ActivityEntry } from '@/services/activityService';

type HistoryEntry = {
  id: string;
  date: Date;
  type: 'entry' | 'exit' | 'guest';
  location?: string;
  details: string;
};

export default function HistoryPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }

      try {
        const entries: HistoryEntry[] = [];

        if (currentUser.role === 'guard') {
          // Guards: fetch their verification history
          const records = await getGuardVerificationHistory(currentUser.uid, 50);
          records.forEach((record: VerificationRecord) => {
            entries.push({
              id: record.id,
              date: new Date(record.timestamp),
              type: record.isValid ? 'entry' : 'exit',
              location: record.destinationAddress || 'Gate',
              details: record.isValid
                ? `Approved: ${record.code}`
                : `Denied: ${record.code}${record.message ? ' — ' + record.message : ''}`,
            });
          });
        } else {
          // Residents: show their code creations + guest check-ins to their household
          const householdId = (currentUser as any).householdId || '';
          const estateId = (currentUser as any).estateId || '';

          if (estateId) {
            const activityEntries = await getHouseholdActivity(
              currentUser.uid,
              householdId,
              estateId,
              50
            );
            activityEntries.forEach((a: ActivityEntry) => {
              entries.push({
                id: a.id,
                date: new Date(a.timestamp),
                type: a.type === 'access_code_created' ? 'guest'
                     : a.type === 'guest_checkin' ? 'entry'
                     : a.type === 'login' ? 'entry'
                     : 'exit',
                location: a.metadata?.destinationAddress?.split('\n')[0] || '',
                details: a.description,
              });
            });
          }

          // Also include push notifications as fallback if no activity entries
          if (entries.length === 0) {
            const notifications = await getUserNotifications(currentUser.uid);
            notifications.forEach((notif: NotificationData) => {
              entries.push({
                id: notif.id,
                date: new Date(notif.timestamp),
                type: notif.type === 'access_code_scan' ? 'guest' : 'entry',
                location: '',
                details: notif.message || notif.type,
              });
            });
          }
        }

        // Sort newest first
        entries.sort((a, b) => b.date.getTime() - a.date.getTime());
        setHistory(entries);
      } catch (error) {
        console.error('Error fetching activity history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 animate-pulse">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Group history entries by date
  const groupedHistory: { [key: string]: HistoryEntry[] } = {};
  history.forEach(entry => {
    const dateKey = entry.date.toLocaleDateString();
    if (!groupedHistory[dateKey]) {
      groupedHistory[dateKey] = [];
    }
    groupedHistory[dateKey].push(entry);
  });

  return (
    <div className="container mx-auto px-4 py-6 max-w-md space-y-5">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => router.back()} 
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Activity History</h1>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{history.length > 0 ? `${history.length} entries` : 'Your recent activity'}</p>
          </div>
        </div>
      </div>
      
      {Object.keys(groupedHistory).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedHistory).map(([dateKey, entries]) => (
            <div key={dateKey} className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{dateKey}</h2>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {entries.map(entry => (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      entry.type === 'entry' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                      entry.type === 'exit' ? 'bg-orange-50 dark:bg-orange-900/20' :
                      'bg-blue-50 dark:bg-blue-900/20'
                    }`}>
                      {entry.type === 'entry' && (
                        <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      )}
                      {entry.type === 'exit' && (
                        <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      )}
                      {entry.type === 'guest' && (
                        <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{entry.details}</p>
                      <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
                        <span className="truncate">{entry.location || ''}</span>
                        <span className="flex-shrink-0 ml-2">{entry.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">No activity history to display</p>
        </div>
      )}
    </div>
  );
}
