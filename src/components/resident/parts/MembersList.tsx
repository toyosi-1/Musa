import { useState } from 'react';
import { getHouseholdMembers } from '@/services/householdService';
import { getUserProfile } from '@/services/userService';

interface MembersListProps {
  householdId: string;
  currentUserId: string;
  onError?: (message: string) => void;
}

interface MemberSummary {
  id: string;
  displayName: string | null;
  email: string | null;
}

/** Collapsible member list — fetches details lazily on first expand. */
export function MembersList({ householdId, currentUserId, onError }: MembersListProps) {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleToggle = async () => {
    if (visible) {
      setVisible(false);
      return;
    }

    if (!loaded) {
      setIsLoading(true);
      try {
        const ids = await getHouseholdMembers(householdId);
        const details = await Promise.all(
          ids.map(async (id) => {
            try {
              const profile = await getUserProfile(id);
              return {
                id,
                displayName: profile?.displayName || null,
                email: profile?.email || null,
              };
            } catch (err) {
              console.error(`Error fetching details for user ${id}:`, err);
              return { id, displayName: null, email: null };
            }
          }),
        );
        setMembers(details);
        setLoaded(true);
      } catch (err) {
        console.error('Error loading members:', err);
        onError?.('Failed to load household members');
        return;
      } finally {
        setIsLoading(false);
      }
    }
    setVisible(true);
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className="text-primary hover:text-primary-dark text-sm flex items-center"
        disabled={isLoading}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
        {visible ? 'Hide Members' : 'Show Members'}
      </button>

      {visible && (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
          <p className="text-sm font-medium mb-1">Household Members:</p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            {members.map((member) => (
              <li key={member.id} className="truncate flex justify-between items-center py-1">
                <div>
                  <span className="font-medium">
                    {member.displayName || member.email || 'Unknown User'}
                    {member.id === currentUserId && ' (You)'}
                  </span>
                  {member.email && member.displayName && (
                    <span className="text-xs text-gray-500 dark:text-gray-300 block">
                      {member.email}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
