import React, { useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface VerificationFormProps {
  onSubmit: (code: string) => Promise<void>;
  isProcessing: boolean;
}

export const VerificationForm = React.memo(({ 
  onSubmit,
  isProcessing 
}: VerificationFormProps) => {
  const [code, setCode] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || isProcessing) return;
    await onSubmit(code);
    setCode('');
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
      <div>
        <input
          ref={inputRef}
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter access code (e.g., MUSA1234)"
          aria-label="Access code input"
          className="input block w-full text-center text-xl font-medium font-mono tracking-wider py-5 text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-800/30 rounded-xl shadow-sm transition-all duration-200"
          disabled={isProcessing}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={10}
          autoFocus
        />
        
        <button
          type="submit"
          className="btn-primary w-full py-4 text-lg font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-300 mt-4"
          disabled={!code.trim() || isProcessing}
        >
          <CheckCircleIcon className="h-5 w-5" />
          {isProcessing ? 'Verifying...' : 'Verify Code'}
        </button>
      </div>
    </form>
  );
});
