import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';

interface FeedEmptyStateProps {
  /** When true the message tells the user to post their first thing. */
  showPersonal: boolean;
}

export function FeedEmptyState({ showPersonal }: FeedEmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center">
      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <ChatBubbleLeftRightIcon className="h-7 w-7 text-gray-300 dark:text-gray-600" />
      </div>
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
        {showPersonal ? "You haven't posted yet" : 'No posts yet'}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {showPersonal ? 'Create your first post!' : 'Be the first to post in your estate feed.'}
      </p>
    </div>
  );
}

export function NoEstateAssigned() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-1">No Estate Assigned</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">You need to be assigned to an estate to view the feed.</p>
    </div>
  );
}
