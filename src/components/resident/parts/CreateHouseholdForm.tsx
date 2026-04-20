import { useState } from 'react';
import type { Household } from '@/types/user';
import { FeedbackBanners } from './FeedbackBanners';

interface CreateHouseholdFormProps {
  onCreate: (name: string) => Promise<Household | null>;
}

const SUCCESS_VISIBLE_MS = 3000;

/** Empty-state card shown when the user doesn't yet have a household. */
export function CreateHouseholdForm({ onCreate }: CreateHouseholdFormProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a household name');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const result = await onCreate(name);
      if (result) {
        setSuccess('Household created successfully!');
        setName('');
        setTimeout(() => setSuccess(''), SUCCESS_VISIBLE_MS);
      } else {
        setError('Could not create household. Check console for details.');
      }
    } catch (err) {
      console.error('Error creating household:', err);
      setError(`Failed to create household: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-lg font-semibold mb-4">Create a Household</h2>
      <FeedbackBanners error={error} success={success} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="householdName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Household Name
          </label>
          <input
            id="householdName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Smith Family"
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
            {isLoading ? 'Creating...' : 'Create Household'}
          </button>
        </div>
      </form>
    </div>
  );
}
