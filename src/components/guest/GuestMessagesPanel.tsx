'use client';

import { useEffect, useState } from 'react';
import { GuestMessage, getHouseholdGuestMessages, updateMessageStatus, subscribeToGuestMessages } from '@/services/guestCommunicationService';
import { formatDistanceToNow } from 'date-fns';

type GuestMessagesPanelProps = {
  householdId: string;
};

export default function GuestMessagesPanel({ householdId }: GuestMessagesPanelProps) {
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial load of messages
    const loadMessages = async () => {
      try {
        const messagesList = await getHouseholdGuestMessages(householdId);
        setMessages(messagesList);
      } catch (err) {
        console.error('Error loading guest messages:', err);
        setError('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToGuestMessages(householdId, (updatedMessages) => {
      setMessages(updatedMessages);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [householdId]);

  const markAsRead = async (messageId: string) => {
    // Only update if not already read
    const message = messages.find(m => m.id === messageId);
    if (message && message.status !== 'read') {
      try {
        await updateMessageStatus(messageId, 'read');
        // Update local state
        setMessages(messages.map(msg => 
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        ));
      } catch (err) {
        console.error('Failed to mark message as read:', err);
      }
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'arrival':
        return (
          <span className="inline-flex items-center justify-center rounded-full bg-green-100 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-600">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </span>
        );
      case 'help':
        return (
          <span className="inline-flex items-center justify-center rounded-full bg-red-100 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-600">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center rounded-full bg-blue-100 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600">
              <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 001.33 0l1.713-3.293a.783.783 0 01.642-.413 41.102 41.102 0 003.55-.414c1.437-.231 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2z" clipRule="evenodd" />
            </svg>
          </span>
        );
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="block h-2 w-2 rounded-full bg-yellow-400" title="Sent"></span>;
      case 'delivered':
        return <span className="block h-2 w-2 rounded-full bg-blue-400" title="Delivered"></span>;
      case 'read':
        return <span className="block h-2 w-2 rounded-full bg-green-400" title="Read"></span>;
      default:
        return null;
    }
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'arrival':
        return 'Arrival';
      case 'help':
        return 'Assistance';
      default:
        return 'Message';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex justify-center items-center min-h-[150px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 text-red-600 text-center min-h-[100px] flex flex-col justify-center items-center">
        <p>{error}</p>
        <button 
          onClick={() => {
            setError(null);
            setIsLoading(true);
            getHouseholdGuestMessages(householdId)
              .then(setMessages)
              .catch(err => setError('Failed to load messages'))
              .finally(() => setIsLoading(false));
          }}
          className="mt-2 text-sm text-primary underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="p-4 sm:p-6 text-center text-gray-500 min-h-[100px] flex flex-col justify-center items-center">
        <p>No guest messages yet.</p>
      </div>
    );
  }

  return (
    <div className="flow-root px-1">
      <ul role="list" className="-mb-8">
        {messages.map((message, messageIdx) => (
          <li key={message.id} onClick={() => markAsRead(message.id!)}>
            <div className={`relative pb-8 ${
              message.status !== 'read' ? 'bg-blue-50 hover:bg-blue-100 active:bg-blue-150' : ''
            } rounded-lg p-3 sm:p-4 transition duration-150`}>
              {messageIdx !== messages.length - 1 ? (
                <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              ) : null}
              <div className="relative flex items-start space-x-3 sm:space-x-4">
                <div className="relative">
                  {getMessageTypeIcon(message.type)}
                  <div className="absolute -bottom-0.5 -right-1">
                    {getStatusIndicator(message.status)}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      {message.guestName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 sm:mt-0">
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-gray-500 mt-0.5">
                    {getMessageTypeLabel(message.type)}
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    <p>{message.message}</p>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
