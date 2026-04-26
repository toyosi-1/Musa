"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { getUserNotifications, NotificationData } from '@/services/notificationService';
import { getGuardVerificationHistory, VerificationRecord } from '@/services/guardActivityService';
import { getHouseholdActivity, getEstateActivity, ActivityEntry, ActivityType } from '@/services/activityService';
import PageLoading from '@/components/ui/PageLoading';

// Icon + color config for every activity type
const ACTIVITY_CONFIG: Record<ActivityType, { label: string; icon: string; bg: string; text: string }> = {
  access_code_created:     { label: 'Code Created',        icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-500' },
  access_code_deactivated: { label: 'Code Deactivated',    icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', bg: 'bg-gray-100 dark:bg-gray-700/30', text: 'text-gray-500' },
  guest_checkin:           { label: 'Guest Check-in',      icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-500' },
  guest_denied:            { label: 'Entry Denied',        icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-500' },
  login:                   { label: 'Login',               icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-500' },
  electricity_purchase:    { label: 'Electricity',         icon: 'M13 10V3L4 14h7v7l9-11h-7z', bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-500' },
  feed_post_created:       { label: 'Feed Post',           icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-500' },
  emergency_alert:         { label: 'Emergency',           icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600' },
  service_request:         { label: 'Service Request',     icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-500' },
  household_created:       { label: 'Household Created',   icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-500' },
  household_joined:        { label: 'Joined Household',    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-500' },
  household_left:          { label: 'Left Household',      icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-500' },
  household_member_removed:{ label: 'Member Removed',      icon: 'M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-500' },
  user_registered:         { label: 'Registered',          icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-500' },
  user_approved:           { label: 'Approved',            icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-500' },
  meter_validated:         { label: 'Meter Validated',     icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-500' },
  payment_initiated:       { label: 'Payment',             icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-500' },
  profile_updated:         { label: 'Profile Updated',     icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', bg: 'bg-gray-100 dark:bg-gray-700/30', text: 'text-gray-500' },
};

const DEFAULT_CONFIG = { label: 'Activity', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-gray-100 dark:bg-gray-700/30', text: 'text-gray-500' };

export default function HistoryPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState<'all' | ActivityType>('all');
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentUser?.uid) { setLoading(false); return; }

      try {
        const entries: ActivityEntry[] = [];
        const estateId = (currentUser as any).estateId || '';
        const householdId = (currentUser as any).householdId || '';

        // Fetch from unified activity log — scope depends on role
        if (estateId) {
          if (currentUser.role === 'estate_admin' || currentUser.role === 'admin') {
            // Admins see security & management activity only (privacy-respecting)
            const ADMIN_VISIBLE_TYPES: ActivityType[] = [
              'guest_checkin', 'guest_denied',
              'emergency_alert',
              'access_code_created', 'access_code_deactivated',
              'household_created', 'household_joined', 'household_left', 'household_member_removed',
              'user_registered', 'user_approved',
              'login',
            ];
            const allActivity = await getEstateActivity(estateId, 200);
            entries.push(...allActivity.filter(e =>
              ADMIN_VISIBLE_TYPES.includes(e.type) || e.userId === currentUser.uid
            ));
          } else if (currentUser.role === 'guard') {
            // Guards see all security-related activity + their own actions
            const allActivity = await getEstateActivity(estateId, 150);
            entries.push(...allActivity.filter(e =>
              e.userId === currentUser.uid ||
              e.type === 'guest_checkin' ||
              e.type === 'guest_denied' ||
              e.type === 'emergency_alert'
            ));
          } else {
            // Residents see their own activity + household guest events
            const activityEntries = await getHouseholdActivity(currentUser.uid, householdId, estateId, 100);
            entries.push(...activityEntries);
          }
        }

        // For guards, also include verification records from guard-specific log
        if (currentUser.role === 'guard') {
          const records = await getGuardVerificationHistory(currentUser.uid, 50);
          records.forEach((record: VerificationRecord) => {
            if (!entries.some(e => e.id === record.id)) {
              entries.push({
                id: record.id,
                type: record.isValid ? 'guest_checkin' : 'guest_denied',
                description: record.isValid
                  ? `Approved entry: ${record.code}${record.destinationAddress ? ' — ' + record.destinationAddress.split('\n')[0] : ''}`
                  : `Denied entry: ${record.code}${record.message ? ' — ' + record.message : ''}`,
                timestamp: record.timestamp,
                userId: record.guardId,
                estateId: estateId,
                householdId: record.householdId,
                metadata: { destinationAddress: record.destinationAddress, code: record.code },
              });
            }
          });
        }

        // Include notifications as fallback if very few entries
        if (entries.length < 5) {
          try {
            const notifications = await getUserNotifications(currentUser.uid);
            notifications.forEach((notif: NotificationData) => {
              if (!entries.some(e => e.id === notif.id)) {
                entries.push({
                  id: notif.id,
                  type: notif.type === 'emergency_alert' ? 'emergency_alert'
                       : notif.type === 'access_code_scan' ? 'guest_checkin'
                       : 'login',
                  description: notif.message || (notif as any).title || notif.type,
                  timestamp: notif.timestamp,
                  userId: currentUser.uid,
                  estateId: estateId,
                });
              }
            });
          } catch (e) {
            console.warn('Notification fallback failed:', e);
          }
        }

        // Deduplicate and sort newest first
        const seen = new Set<string>();
        const unique = entries.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
        unique.sort((a, b) => b.timestamp - a.timestamp);
        setHistory(unique);
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
      <PageLoading
        accent="purple"
        className="flex flex-col items-center justify-center min-h-[60vh] gap-3"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    );
  }

  // Get unique activity types present in the data for filter chips
  const presentTypes: ActivityType[] = Array.from(new Set(history.map(e => e.type)));
  const filtered = filter === 'all' ? history : history.filter(e => e.type === filter);

  // Group by date
  const groupedHistory: { [key: string]: ActivityEntry[] } = {};
  filtered.forEach(entry => {
    const dateKey = new Date(entry.timestamp).toLocaleDateString();
    if (!groupedHistory[dateKey]) groupedHistory[dateKey] = [];
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
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Activity Log</h1>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{history.length > 0 ? `${history.length} events recorded` : 'Comprehensive audit trail'}</p>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      {presentTypes.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
              filter === 'all'
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
          >
            All ({history.length})
          </button>
          {presentTypes.map((t: ActivityType) => {
            const cfg = ACTIVITY_CONFIG[t] || DEFAULT_CONFIG;
            const count = history.filter(e => e.type === t).length;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                  filter === t
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {Object.keys(groupedHistory).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedHistory).map(([dateKey, entries]) => (
            <div key={dateKey} className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{dateKey}</h2>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {entries.map(entry => {
                  const cfg = ACTIVITY_CONFIG[entry.type] || DEFAULT_CONFIG;
                  const iconPaths = cfg.icon.split(' M').map((p, i) => i === 0 ? p : 'M' + p);
                  return (
                    <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                        <svg className={`h-4 w-4 ${cfg.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          {iconPaths.map((d, i) => (
                            <path key={i} strokeLinecap="round" strokeLinejoin="round" d={d} />
                          ))}
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5 leading-snug">{entry.description}</p>
                        {entry.metadata?.destinationAddress && (
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{entry.metadata.destinationAddress.split('\n')[0]}</p>
                        )}
                        {entry.metadata?.amount && (
                          <p className="text-[11px] text-gray-400 mt-0.5">Amount: ₦{entry.metadata.amount.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
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
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No activity recorded yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Your actions will appear here as they happen</p>
        </div>
      )}
    </div>
  );
}
