"use client";

import { useState } from 'react';

export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    // Simulate sending request (in production, this would write to Firebase or send an email)
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <a href="/" className="text-white hover:text-blue-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </a>
          <h1 className="text-lg font-bold">Musa</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-grow flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {submitted ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Request Submitted</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your account deletion request has been received. We will process it within <strong>30 days</strong> and send a confirmation to <strong>{email}</strong>.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                All your personal data, access codes, household information, and activity history will be permanently deleted.
              </p>
              <a
                href="/"
                className="inline-block mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Return to Home
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Delete Your Account</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We&apos;re sorry to see you go. Submitting this form will request permanent deletion of your Musa account and all associated data.
              </p>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm mb-2">What will be deleted:</h3>
                <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                  <li>• Your account and profile information</li>
                  <li>• All access codes you have created</li>
                  <li>• Household membership and management data</li>
                  <li>• Activity and verification history</li>
                  <li>• Community feed posts and interactions</li>
                  <li>• Notification history</li>
                </ul>
              </div>

              <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email address associated with your account *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason for leaving (optional)
                  </label>
                  <textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Let us know why you're leaving so we can improve..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Submitting...' : 'Request Account Deletion'}
                </button>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Your request will be processed within 30 days. You will receive a confirmation email once your data has been deleted.
                </p>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} Musa - Estate Access Control</p>
        <p className="mt-1">
          <a href="mailto:toyosiajibola@musa-security.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            toyosiajibola@musa-security.com
          </a>
        </p>
      </footer>
    </div>
  );
}
