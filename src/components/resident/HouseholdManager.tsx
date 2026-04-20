"use client";

import { useEffect, useState } from 'react';
import type { Household, User } from '@/types/user';
import { CreateHouseholdForm } from './parts/CreateHouseholdForm';
import { AddressSection } from './parts/AddressSection';
import { MembersList } from './parts/MembersList';
import { InviteMemberCard } from './parts/InviteMemberCard';
import { DangerZoneCard } from './parts/DangerZoneCard';
import { FeedbackBanners } from './parts/FeedbackBanners';

interface HouseholdManagerProps {
  user: User;
  household: Household | null;
  onCreateHousehold: (name: string) => Promise<Household | null>;
  refreshHousehold?: () => Promise<void>;
}

const FEEDBACK_VISIBLE_MS = 3000;

export default function HouseholdManager({
  user,
  household,
  onCreateHousehold,
  refreshHousehold,
}: HouseholdManagerProps) {
  // Transient feedback surfaced by child components (address update, members fetch).
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), FEEDBACK_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [success]);

  if (!household) {
    return <CreateHouseholdForm onCreate={onCreateHousehold} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
        <FeedbackBanners error={error} success={success} />

        <div className="flex justify-between items-center mb-4 gap-2">
          <h2 className="text-base sm:text-lg font-semibold">Household Details</h2>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              user.isHouseholdHead
                ? 'bg-primary/10 text-primary'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {user.isHouseholdHead ? 'Head' : 'Member'}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-300">Name:</span>
            <p className="font-medium">{household.name}</p>
          </div>

          <div>
            <span className="text-sm text-gray-500 dark:text-gray-300">Created:</span>
            <p className="font-medium">
              {new Date(household.createdAt).toLocaleDateString()}
            </p>
          </div>

          <AddressSection
            household={household}
            userId={user.uid}
            onUpdated={refreshHousehold}
            onFeedback={({ error: e, success: s }) => {
              if (e) setError(e);
              if (s) {
                setError('');
                setSuccess(s);
              }
            }}
          />

          <MembersList
            householdId={household.id}
            currentUserId={user.uid}
            onError={setError}
          />
        </div>
      </div>

      <InviteMemberCard householdId={household.id} userId={user.uid} />

      <DangerZoneCard household={household} onLeave={refreshHousehold} />
    </div>
  );
}
