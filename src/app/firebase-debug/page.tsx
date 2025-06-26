'use client';

import { useEffect, useState } from 'react';
import { testFirebaseConnection, getFirebaseConfigFromEnv } from '@/lib/firebase-debug';

export default function FirebaseDebugPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runFirebaseTest = async () => {
    try {
      setIsTesting(true);
      setError(null);
      
      console.log('🔍 Getting Firebase config from environment...');
      const config = getFirebaseConfigFromEnv();
      
      if (!config) {
        throw new Error('Invalid Firebase configuration. Please check your environment variables.');
      }
      
      console.log('🚀 Starting Firebase connection test...');
      const result = await testFirebaseConnection(config);
      console.log('🏁 Firebase test completed:', result);
      
      setTestResult({
        ...result,
        timestamp: new Date().toISOString(),
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isBrowser: typeof window !== 'undefined',
          hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
          protocol: typeof window !== 'undefined' ? window.location.protocol : 'server',
        },
        config: {
          ...config,
          apiKey: config.apiKey ? '***' + config.apiKey.slice(-4) : 'missing',
        }
      });
    } catch (err) {
      console.error('🔥 Error running Firebase test:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    // Auto-run the test when the component mounts
    runFirebaseTest();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Firebase Connection Tester
        </h1>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Connection Test
            </h2>
            <button
              onClick={runFirebaseTest}
              disabled={isTesting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? 'Testing...' : 'Run Test Again'}
            </button>
          </div>

          {error && (
            <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
              <span className="font-medium">Error:</span> {error}
            </div>
          )}

          {testResult ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Test Results</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <p className={`font-mono ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {testResult.success ? '✅ Success' : '❌ Failed'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Timestamp</p>
                    <p className="font-mono text-sm">{new Date(testResult.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Services</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="w-32 text-sm text-gray-500 dark:text-gray-400">Firebase App</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${testResult.services.app ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                      {testResult.services.app ? '✅ Connected' : '❌ Disconnected'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 text-sm text-gray-500 dark:text-gray-400">Authentication</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${testResult.services.auth ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                      {testResult.services.auth ? '✅ Connected' : '❌ Disconnected'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 text-sm text-gray-500 dark:text-gray-400">Realtime DB</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${testResult.services.database ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                      {testResult.services.database ? '✅ Connected' : '❌ Disconnected'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Environment</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Environment</span>
                    <span className="font-mono text-sm">{testResult.environment.nodeEnv || 'development'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Running in Browser</span>
                    <span className="font-mono text-sm">{testResult.environment.isBrowser ? '✅ Yes' : '❌ No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Hostname</span>
                    <span className="font-mono text-sm">{testResult.environment.hostname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Protocol</span>
                    <span className="font-mono text-sm">{testResult.environment.protocol}</span>
                  </div>
                </div>
              </div>

              {testResult.error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">Error Details</h3>
                  <div className="bg-black/90 p-4 rounded overflow-x-auto">
                    <pre className="text-green-400 text-sm font-mono">
                      {JSON.stringify({
                        error: testResult.error,
                        details: testResult.details
                      }, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Configuration</h3>
                <div className="bg-black/90 p-4 rounded overflow-x-auto">
                  <pre className="text-green-400 text-sm font-mono">
                    {JSON.stringify(testResult.config, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : isTesting ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-700 dark:text-gray-300">Testing Firebase connection...</span>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Run the test to check Firebase connection status
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Next Steps
          </h2>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li>✅ Ensure all required Firebase environment variables are set in <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">.env.local</code></li>
            <li>✅ Check that your Firebase project has the necessary services enabled (Auth, Realtime Database)</li>
            <li>✅ Verify that your Firebase project's authorized domains include this app's domain</li>
            <li>✅ If using emulators, ensure they are running and properly configured</li>
            <li>✅ Check the browser console for detailed error messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
