"use client";

import { useState } from 'react';
import { sendHouseholdInvitationEmail } from '@/services/smtpEmailService';

export default function EmailDiagnosticTest() {
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testEmailDelivery = async () => {
    if (!testEmail) {
      addResult('❌ Please enter a test email address');
      return;
    }

    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('🔍 Starting email diagnostic test...');
      
      // Test 1: API Route Test
      addResult('1️⃣ Testing /api/send-email endpoint...');
      
      const apiTestResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailData: {
            to: testEmail,
            subject: '🧪 Musa API Test Email',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>🧪 Musa Email API Test</h2>
                <p>This is a test email sent directly through the Musa email API.</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                <p><strong>Test Email:</strong> ${testEmail}</p>
                <p>If you received this email, the API route is working correctly!</p>
              </div>
            `
          },
          smtpConfig: {
            host: 'mail.hspace.cloud',
            port: 465,
            secure: true,
            auth: {
              user: 'toyosiajibola@musa-security.com',
              pass: 'Olatoyosi1'
            }
          }
        })
      });

      if (apiTestResponse.ok) {
        const apiResult = await apiTestResponse.json();
        addResult(`✅ API Test: Email sent successfully (ID: ${apiResult.messageId})`);
      } else {
        addResult(`❌ API Test: Failed with status ${apiTestResponse.status}`);
      }

      // Test 2: Household Invitation Email
      addResult('2️⃣ Testing household invitation email...');
      
      const inviteResult = await sendHouseholdInvitationEmail({
        householdName: 'Test Household (Diagnostic)',
        inviterName: 'Email Diagnostic System',
        acceptUrl: `${window.location.origin}/invite/diagnostic-test-${Date.now()}`,
        recipientEmail: testEmail
      });

      if (inviteResult) {
        addResult('✅ Household Invitation: Email sent successfully!');
      } else {
        addResult('❌ Household Invitation: Email sending failed');
      }

      // Test 3: Environment Check
      addResult('3️⃣ Checking environment...');
      addResult(`📍 Current URL: ${window.location.origin}`);
      addResult(`🌐 User Agent: ${navigator.userAgent.substring(0, 50)}...`);
      
      // Final recommendations
      addResult('');
      addResult('🎯 RECOMMENDATIONS:');
      addResult('1. Check spam/junk folder for both test emails');
      addResult('2. Verify email address is correct and accessible');
      addResult('3. Try with different email providers (Gmail, Outlook, Yahoo)');
      addResult('4. Check if corporate firewall is blocking emails');
      addResult('5. Whitelist toyosiajibola@musa-security.com in email settings');
      
    } catch (error) {
      addResult(`❌ Test failed with error: ${error}`);
      console.error('Email diagnostic error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        📧 Email Diagnostic Test
      </h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Test Email Address:
        </label>
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="Enter email to test delivery..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <button
        onClick={testEmailDelivery}
        disabled={isLoading || !testEmail}
        className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        {isLoading ? '🔄 Running Tests...' : '🧪 Run Email Diagnostic'}
      </button>

      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
            Test Results:
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className="text-sm font-mono text-gray-700 dark:text-gray-300 mb-1"
              >
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
          💡 How to Use:
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>1. Enter the email address that should receive invitations</li>
          <li>2. Click "Run Email Diagnostic" to test the system</li>
          <li>3. Check both your inbox and spam folder for test emails</li>
          <li>4. Review the results to identify any issues</li>
        </ul>
      </div>
    </div>
  );
}
