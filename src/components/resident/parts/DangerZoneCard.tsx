import type { Household } from '@/types/user';
import LeaveHouseholdButton from '@/components/household/LeaveHouseholdButton';

interface DangerZoneCardProps {
  household: Household;
  onLeave?: () => Promise<void> | void;
}

/** "Leave household" card — the only destructive action on this screen. */
export function DangerZoneCard({ household, onLeave }: DangerZoneCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-red-500">
      <h2 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        Danger Zone
      </h2>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Once you leave this household, you will lose access to all household features and will need to be re-invited to rejoin.
      </p>

      <LeaveHouseholdButton household={household} onLeave={onLeave} />
    </div>
  );
}
