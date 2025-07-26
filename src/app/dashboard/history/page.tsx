"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

type HistoryEntry = {
  id: string;
  date: Date;
  type: 'entry' | 'exit' | 'guest';
  location?: string; // Optional location field
  details: string;
};

export default function HistoryPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Simulate loading history data
    const timer = setTimeout(() => {
      // Mock data for demonstration
      setHistory([
        {
          id: '1',
          date: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          type: 'entry',

          details: 'Self entry'
        },
        {
          id: '2',
          date: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          type: 'exit',

          details: 'Self exit'
        },
        {
          id: '3',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          type: 'guest',

          details: 'Guest: John Smith'
        },
        {
          id: '4',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          type: 'entry',

          details: 'Self entry'
        }
      ]);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
    <div className="container mx-auto px-4 py-6 max-w-md relative">
      <button 
        onClick={() => router.back()} 
        className="absolute top-0 left-0 flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-1" />
        <span className="font-medium">Back</span>
      </button>
      
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">Activity History</h1>
      
      {Object.keys(groupedHistory).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedHistory).map(([dateKey, entries]) => (
            <div key={dateKey} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-300 mb-3">{dateKey}</h2>
              
              <div className="space-y-3">
                {entries.map(entry => (
                  <div key={entry.id} className="flex items-start border-l-4 pl-3 py-1 border-blue-500">
                    <div className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 p-2 rounded-full mr-3">
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
                      <p className="font-medium">{entry.details}</p>
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-300">
                        <span>{entry.location}</span>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-300">No activity history to display</p>
        </div>
      )}
    </div>
  );
}
