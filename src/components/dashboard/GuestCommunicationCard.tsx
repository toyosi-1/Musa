'use client';

import { useState } from 'react';
import GuestMessagesPanel from '@/components/guest/GuestMessagesPanel';
import { Button } from '@/components/ui/Button';

type GuestCommunicationCardProps = {
  householdId: string;
};

export default function GuestCommunicationCard({ householdId }: GuestCommunicationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden w-full">
      <div className="p-4 sm:p-6 space-y-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Guest Communication</h3>
          <Button 
            onClick={() => setIsExpanded(!isExpanded)}
            variant="ghost"
            size="sm"
            className="text-sm"
          >
            {isExpanded ? 'Hide' : 'View'} Messages
          </Button>
        </div>
        
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View and manage messages from visitors and guests.
        </p>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 overflow-x-auto">
          <GuestMessagesPanel householdId={householdId} />
        </div>
      )}
    </div>
  );
}
