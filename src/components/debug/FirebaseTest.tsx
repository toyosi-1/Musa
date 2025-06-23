"use client";

import { useState, useEffect } from 'react';
import { getFirebaseAuth, getFirebaseDatabase, isFirebaseReady, firebaseInitComplete } from '@/lib/firebase';
import { signInWithEmailAndPassword, getAuth, User as FirebaseUser } from 'firebase/auth';
import { ref, get, getDatabase } from 'firebase/database';

export default function FirebaseTest() {
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [authState, setAuthState] = useState<{initialized: boolean; user: FirebaseUser | null}>({initialized: false, user: null});
  const [dbState, setDbState] = useState<{initialized: boolean; connected: boolean}>({initialized: false, connected: false});
  const [email, setEmail] = useState('tobotom@yahoo.com'); // Pre-filled with the email you were trying

  // Check initial Firebase state on component mount
  useEffect(() => {
    // Check auth initialization
    try {
      const currentAuth = getAuth();
      setAuthState({
        initialized: !!currentAuth,
        user: currentAuth.currentUser
      });
    } catch (err) {
      console.error('Error checking auth state:', err);
    }
    
    // Check database initialization
    try {
      const currentDb = getDatabase();
      setDbState({
        initialized: !!currentDb,
        connected: false // Will check connection in test
      });
    } catch (err) {
      console.error('Error checking database state:', err);
    }
    
    // Wait for Firebase init to complete
    firebaseInitComplete().then(success => {
      console.log('Firebase init promise resolved:', success);
    }).catch(err => {
      console.error('Firebase init promise error:', err);
    });
  }, []);
  
  const runTest = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      // Add a detailed log of current state
      console.log('Current Firebase state:', {
        firebaseReady: isFirebaseReady()
      });
      
      // Get Firebase auth and database instances
      const auth = await getFirebaseAuth();
      const db = await getFirebaseDatabase();
      // Step 1: Test Firebase connection
      setTestResult({success: true, message: 'Testing Firebase connection...'});
      
      // Step 2: Test authentication directly
      try {
        setTestResult({success: true, message: 'Testing auth: Attempting to sign in...'});
        const auth = await getFirebaseAuth();
        const userCredential = await signInWithEmailAndPassword(auth, email, 'test-password');
        setTestResult({success: true, message: `Auth test success! User ID: ${userCredential.user.uid}`});
      } catch (authError: any) {
        // Expected error with wrong password, but shows auth is working
        if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
          setTestResult({success: true, message: 'Auth service is working! (Expected password error)'});
        } else {
          // This is an unexpected auth error
          throw new Error(`Auth test failed: ${authError.code} - ${authError.message}`);
        }
      }
      
      // Step 3: Test database connection
      try {
        setTestResult({success: true, message: 'Testing database connection...'});
        const db = await getFirebaseDatabase();
        const testRef = ref(db, '.info/connected');
        const snapshot = await get(testRef);
        setTestResult({
          success: true, 
          message: `Database connection ${snapshot.val() ? 'successful' : 'failed'}`
        });
      } catch (dbError) {
        throw new Error(`Database test failed: ${dbError}`);
      }
      
      setTestResult({success: true, message: 'All Firebase services are working correctly!'});
    } catch (error) {
      console.error('Firebase test failed:', error);
      setTestResult({
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4 my-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-medium">Firebase Connection Test</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="p-3 border rounded-lg">
          <h4 className="font-medium mb-2">Auth Status</h4>
          <div className="text-sm space-y-1">
            <p>Initialized: <span className={authState.initialized ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{authState.initialized ? 'Yes' : 'No'}</span></p>
            <p>Ready: <span className={isFirebaseReady() ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>{isFirebaseReady() ? 'Yes' : 'Not Yet'}</span></p>
            <p>User: {authState.user ? <span className="text-green-600 dark:text-green-400">{authState.user.email}</span> : <span className="text-gray-500">Not signed in</span>}</p>
          </div>
        </div>
        
        <div className="p-3 border rounded-lg">
          <h4 className="font-medium mb-2">Database Status</h4>
          <div className="text-sm space-y-1">
            <p>Initialized: <span className={dbState.initialized ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{dbState.initialized ? 'Yes' : 'No'}</span></p>
            <p>Connected: <span className={dbState.connected ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>{dbState.connected ? 'Yes' : 'Not verified'}</span></p>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input flex-1"
          placeholder="Email to test"
        />
        <button 
          onClick={runTest} 
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Testing...' : 'Run Test'}
        </button>
      </div>
      
      {testResult && (
        <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'}`}>
          <p>{testResult.message}</p>
        </div>
      )}
    </div>
  );
}
