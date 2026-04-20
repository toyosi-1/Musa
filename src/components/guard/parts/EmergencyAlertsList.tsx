import { formatDistanceToNow } from 'date-fns';
import type { EmergencyAlert } from '@/types/user';
import { getEmergencyTypeInfo } from '@/services/emergencyService';

interface EmergencyAlertsListProps {
  alerts: EmergencyAlert[];
  onAcknowledge: (alertId: string) => void;
}

/**
 * Red-themed list of active emergency alerts with per-item acknowledge button.
 * Renders nothing when the list is empty.
 */
export function EmergencyAlertsList({ alerts, onAcknowledge }: EmergencyAlertsListProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="mb-6 space-y-3 animate-pulse-slow">
      {alerts.map((alert) => {
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
                onClick={() => onAcknowledge(alert.id)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex-shrink-0"
              >
                Acknowledge
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
