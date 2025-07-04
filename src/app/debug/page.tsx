'use client';

import { useEffect, useState } from 'react';
import { initializeFirebase, isFirebaseReady } from '@/lib/firebase';

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>(['Debugging Firebase initialization...']);
  const [firebaseConfig, setFirebaseConfig] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
    console.log(`[Debug] ${message}`);
  };

  useEffect(() => {
    // Log window.ENV if it exists
    if (typeof window !== 'undefined') {
      addLog('Window object is available');
      
      // @ts-ignore
      if (window.ENV) {
        // @ts-ignore
        setFirebaseConfig(window.ENV);
        addLog('Found window.ENV with Firebase config');
      } else {
        addLog('window.ENV is not available');
      }
    }

    // Initialize Firebase with detailed logging
    const initFirebase = async () => {
      try {
        addLog('Starting Firebase initialization...');
        
        // Check if Firebase is already initialized
        if (isFirebaseReady()) {
          addLog('Firebase is already initialized');
          setIsInitialized(true);
          return;
        }

        // Initialize Firebase
        addLog('Calling initializeFirebase()...');
        const success = await initializeFirebase();
        
        if (success) {
          addLog('✅ Firebase initialized successfully!');
          setIsInitialized(true);
          
          // Test database connection
          try {
            addLog('Testing database connection...');
            const { getDatabase, ref, get } = await import('firebase/database');
            const db = getDatabase();
            const testRef = ref(db, '.info/connected');
            const snapshot = await get(testRef);
            addLog(`Database connection test result: ${snapshot.val()}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addLog(`❌ Database test failed: ${errorMessage}`);
          }
        } else {
          addLog('❌ Firebase initialization failed');
          setError('Firebase failed to initialize. Check the logs for details.');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addLog(`❌ Error during initialization: ${errorMessage}`);
        setError(`Initialization error: ${errorMessage}`);
      }
    };

    initFirebase();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Firebase Debug Information</h1>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Status</h2>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${isInitialized ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span>{isInitialized ? 'Firebase is initialized' : 'Initializing Firebase...'}</span>
          </div>
          {error && (
            <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
              Error: {error}
            </div>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Environment Variables</h2>
          <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
            <pre className="text-sm">
              {JSON.stringify(firebaseConfig, null, 2) || 'No environment variables found in window.ENV'}
            </pre>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Initialization Logs</h2>
          <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                &gt; {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
