'use client';

import { useState } from 'react';
import { sendGuestMessage } from '@/services/guestCommunicationService';
import { Button } from '@/components/ui/Button';

type GuestMessageFormProps = {
  householdId: string;
  accessCodeId?: string;
  onMessageSent?: () => void;
  onCancel?: () => void;
};

export default function GuestMessageForm({
  householdId,
  accessCodeId,
  onMessageSent,
  onCancel
}: GuestMessageFormProps) {
  const [guestName, setGuestName] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'arrival' | 'message' | 'help'>('arrival');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guestName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!message.trim() && messageType !== 'arrival') {
      setError('Please enter a message');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // For arrival notifications, set a default message if empty
      const finalMessage = messageType === 'arrival' && !message.trim() 
        ? `${guestName} has arrived and is waiting at the entrance.`
        : message;
      
      await sendGuestMessage({
        householdId,
        guestName,
        message: finalMessage,
        accessCodeId,
        type: messageType
      });
      
      setSuccess(true);
      setGuestName('');
      setMessage('');
      
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 sm:p-5 bg-green-50 border border-green-200 rounded-md max-w-md mx-auto w-full">
        <h3 className="text-lg font-medium text-green-800">Message Sent!</h3>
        <p className="text-sm text-green-600 mt-1">
          Your message has been sent to the resident.
        </p>
        <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button onClick={() => setSuccess(false)} variant="outline">
            Send Another
          </Button>
          {onCancel && (
            <Button onClick={onCancel} variant="ghost">
              Close
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto w-full">
      <div>
        <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">
          Your Name
        </label>
        <input
          type="text"
          id="guestName"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Enter your name"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
          disabled={isLoading}
        />
      </div>
      
      <div>
        <label htmlFor="messageType" className="block text-sm font-medium text-gray-700">
          Message Type
        </label>
        <select
          id="messageType"
          value={messageType}
          onChange={(e) => setMessageType(e.target.value as any)}
          className="mt-1 block w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-primary focus:border-primary text-base"
          disabled={isLoading}
        >
          <option value="arrival">I&apos;ve Arrived</option>
          <option value="message">Custom Message</option>
          <option value="help">Need Assistance</option>
        </select>
      </div>
      
      {messageType !== 'arrival' && (
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            {messageType === 'help' ? 'What do you need help with?' : 'Message'}
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              messageType === 'help' 
                ? "Please describe what you need help with..."
                : "Enter your message to the resident"
            }
            rows={3}
            className="mt-1 block w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary text-base"
            disabled={isLoading}
          />
        </div>
      )}
      
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-3">
        {onCancel && (
          <Button 
            type="button" 
            onClick={onCancel}
            variant="outline"
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          isLoading={isLoading}
          className="flex-1"
        >
          {messageType === 'arrival'
            ? 'Notify Resident of Arrival'
            : messageType === 'help'
              ? 'Request Assistance'
              : 'Send Message'}
        </Button>
      </div>
    </form>
  );
}
