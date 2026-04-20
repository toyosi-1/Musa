import { useState } from 'react';
import { createHouseholdInvite } from '@/services/householdService';
import { FeedbackBanners } from './FeedbackBanners';

interface InviteMemberCardProps {
  householdId: string;
  userId: string;
}

const SUCCESS_VISIBLE_MS = 3000;

/** Card with the "invite new member by email" form. Self-contained state. */
export function InviteMemberCard({ householdId, userId }: InviteMemberCardProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await createHouseholdInvite(householdId, userId, email);
      setSuccess(`Invitation sent to ${email}. They will appear in your household after accepting.`);
      setEmail('');
      setTimeout(() => setSuccess(''), SUCCESS_VISIBLE_MS);
    } catch (err) {
      console.error('Error inviting member:', err);
      setError(
        err instanceof Error
          ? `Failed to send invitation: ${err.message}`
          : 'Failed to send invitation: Unknown error',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        Invite New Member
      </h2>

      <FeedbackBanners error={error} success={success} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Address
          </label>
          <input
            id="inviteEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            className="input w-full"
            disabled={isLoading}
          />
        </div>
        <div className="pt-2">
          <button
            type="submit"
            className="w-full px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </form>
    </div>
  );
}
