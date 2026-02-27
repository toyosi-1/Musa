"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { getUserNotifications, NotificationData } from '@/services/notificationService';
import { getGuardVerificationHistory, VerificationRecord } from '@/services/guardActivityService';

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
          // Residents: fetch their notifications (code scans, etc.)
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
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <LoadingSpinner />
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
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => router.back()} 
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          <span className="font-medium text-sm">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Activity History</h1>
        <div className="w-16" />
      </div>
      
      {Object.keys(groupedHistory).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedHistory).map(([dateKey, entries]) => (
            <div key={dateKey} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-300 mb-3">{dateKey}</h2>
              
              <div className="space-y-3">
                {entries.map(entry => (
                  <div key={entry.id} className={`flex items-start border-l-4 pl-3 py-1 ${
                    entry.type === 'entry' ? 'border-green-500' :
                    entry.type === 'exit' ? 'border-orange-500' :
                    'border-blue-500'
                  }`}>
                    <div className={`p-2 rounded-full mr-3 ${
                      entry.type === 'entry' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                      entry.type === 'exit' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      {entry.type === 'entry' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      )}
                      {entry.type === 'exit' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      )}
                      {entry.type === 'guest' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{entry.details}</p>
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>{entry.location || ''}</span>
                        <span>{entry.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-300">No activity history to display</p>
        </div>
      )}
    </div>
  );
}
