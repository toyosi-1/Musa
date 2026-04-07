import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator, 
  Auth, 
  setPersistence, 
  browserLocalPersistence, 
  indexedDBLocalPersistence,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  onAuthStateChanged,
  UserCredential
} from 'firebase/auth';
import { 
  getDatabase, 
  connectDatabaseEmulator, 
  Database, 
  ref, 
  get, 
  onValue, 
  DataSnapshot,
  goOnline,
  goOffline,
  update
} from 'firebase/database';
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
  enableIndexedDbPersistence
} from 'firebase/firestore';

// Firebase configuration - using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// Initialize Firebase instances
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Database | null = null;

// Connection status tracking
let isInitialized = false;
let connectionPromise: Promise<boolean> | null = null;

// Export types for convenience
type FirebaseAppType = FirebaseApp;
type AuthType = Auth;
type DatabaseType = Database;
type FirestoreType = Firestore;

// Connection test timeout (in ms) - reduced for faster response
const CONNECTION_TIMEOUT = 3000; // 3 seconds for faster feedback

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'databaseURL'
  ];
  
  const missingFields = requiredFields.filter(
    field => !firebaseConfig[field as keyof typeof firebaseConfig]
  );
  
  if (missingFields.length > 0) {
    console.error('Missing Firebase configuration fields:', missingFields);
    console.error('Current config values:', {
      apiKey: firebaseConfig.apiKey ? '[SET]' : '[MISSING]',
      authDomain: firebaseConfig.authDomain ? '[SET]' : '[MISSING]',
      projectId: firebaseConfig.projectId ? '[SET]' : '[MISSING]',
      databaseURL: firebaseConfig.databaseURL ? '[SET]' : '[MISSING]',
      storageBucket: firebaseConfig.storageBucket ? '[SET]' : '[MISSING]',
      messagingSenderId: firebaseConfig.messagingSenderId ? '[SET]' : '[MISSING]',
      appId: firebaseConfig.appId ? '[SET]' : '[MISSING]',
      measurementId: firebaseConfig.measurementId ? '[SET]' : '[MISSING]'
    });
    console.error('');
    console.error('🔥 FIREBASE SETUP REQUIRED 🔥');
    console.error('');
    console.error('To fix login issues:');
    console.error('1. Copy sample.env.local to .env.local');
    console.error('2. Replace placeholder values with your Firebase project config');
    console.error('3. Get your config from: https://console.firebase.google.com');
    console.error('');
    console.error('Or create .env.local with these values:');
    console.error('NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key');
    console.error('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com');
    console.error('NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id');
    console.error('NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-rtdb.firebaseio.com');
    console.error('');
    return false;
  }
  console.log('Firebase configuration validation passed');
  return true;
};

// Performance monitoring - minimal overhead
const isDev = process.env.NODE_ENV === 'development';
const logDebug = (...args: any[]) => { if (isDev) console.log(...args); };

// Lazy initialization variables with proper typing
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let rtdb: Database | undefined;
let firestore: Firestore | undefined;
let firebaseStorageInstance: any | undefined;
let firebaseInitialized = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Gets the Firebase app instance, initializing it if necessary
 */
export async function getFirebaseApp(): Promise<FirebaseApp> {
  // Return undefined immediately in server context
  if (typeof window === 'undefined') {
    console.log('Server context detected, returning empty Firebase app stub');
    return {} as FirebaseApp;
  }
  
  if (!firebaseApp) {
    try {
      // Dynamically import Firebase modules only on client side
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      
      // Check if app is already initialized
      if (getApps().length === 0) {
        console.log('Initializing new Firebase app');
        firebaseApp = initializeApp(firebaseConfig);
      } else {
        console.log('Using existing Firebase app');
        firebaseApp = getApp();
      }
    } catch (error) {
      console.error('Error initializing Firebase app:', error);
      throw new Error('Failed to initialize Firebase app');
    }
  }
  
  return firebaseApp as FirebaseApp;
}

/**
 * Gets the Firebase Auth instance, initializing app if necessary
 */
export async function getFirebaseAuth(): Promise<Auth> {
  // If already initialized, return it immediately
  if (auth) return auth;
  
  // Ensure the app is initialized first
  const app = await getFirebaseApp();
  
  // Initialize Auth with enhanced persistence for iOS PWA
  try {
    auth = getAuth(app);
    
    // Use browserLocalPersistence (localStorage) as PRIMARY for ALL platforms
    try {
      await setPersistence(auth!, browserLocalPersistence);
      logDebug('✅ Auth persistence set to localStorage');
    } catch (persistError) {
      try {
        await setPersistence(auth!, indexedDBLocalPersistence);
        logDebug('✅ Auth persistence set to IndexedDB (fallback)');
      } catch (indexedDBError) {
        console.error('❌ All persistence methods failed:', indexedDBError);
      }
    }
    
    // Add localStorage backup for auth state on ALL platforms
    if (typeof window !== 'undefined') {
      const backupAuthKey = 'firebase:authBackup';
      
      auth!.onAuthStateChanged((user) => {
        if (user) {
          localStorage.setItem(backupAuthKey, JSON.stringify({
            uid: user.uid,
            email: user.email,
            refreshToken: user.refreshToken,
            lastLogin: Date.now()
          }));
        }
      });
    }
    
    // Connect to emulator in development
    if (process.env.NODE_ENV === 'development' && 
        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      try {
        connectAuthEmulator(auth!, 'http://localhost:9099', { disableWarnings: true });
      } catch (error) {
        console.warn('⚠️ Failed to connect to Auth emulator:', error);
      }
    }
    
    return auth;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Auth:', error);
    throw error;
  }
}

/**
 * Gets the Firebase Realtime Database instance, initializing app if necessary
 */
export async function getFirebaseDatabase(): Promise<Database> {
  // Return empty stub in server context
  if (typeof window === 'undefined') {
    console.log('Server context detected, returning empty Database stub');
    return {} as Database;
  }
  
  if (!firebaseDb) {
    try {
      const { getDatabase, connectDatabaseEmulator } = await import('firebase/database');
      const app = await getFirebaseApp();
      
      const databaseURL = window.ENV?.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 
                         process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
      
      if (!databaseURL) {
        throw new Error('Firebase Database URL is not configured. Please check your environment variables.');
      }
      
      firebaseDb = getDatabase(app, databaseURL);
      
      try {
        goOnline(firebaseDb);
      } catch (e) {
        // Non-critical
      }
      
      // Emulator support
      if (process.env.NODE_ENV === 'development' && 
          process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
        try {
          connectDatabaseEmulator(firebaseDb, 'localhost', 9000);
        } catch (err) {
          console.warn('⚠️ Failed to connect to Database emulator:', err);
        }
      }
      
      logDebug('✅ Firebase Database initialized');
    } catch (error: unknown) {
      console.error('❌ Error initializing Firebase Database:', error);
      
      if (error && typeof error === 'object') {
        const firebaseError = error as { code?: string; message: string };
        throw new Error(`Failed to initialize Firebase Database: ${firebaseError.message || 'Unknown error'}`);
      }
      
      throw new Error('Failed to initialize Firebase Database: Unknown error occurred');
    }
  }
  
  return firebaseDb as Database;
}

/**
 * Gets the Firebase Firestore instance, initializing app if necessary
 */
export async function getFirebaseFirestore(): Promise<Firestore> {
  // Return empty stub in server context
  if (typeof window === 'undefined') {
    console.log('Server context detected, returning empty Firestore stub');
    return {} as Firestore;
  }
  
  if (!firestore) {
    console.log('🔄 Initializing Firebase Firestore...');
    try {
      // Dynamically import Firebase Firestore modules
      const { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } = await import('firebase/firestore');
      const app = await getFirebaseApp();
      
      // Initialize Firestore
      firestore = getFirestore(app);
      
      // Enable offline persistence for better performance
      try {
        enableIndexedDbPersistence(firestore)
          .then(() => console.log('✅ Firestore persistence enabled'))
          .catch((err) => {
            if (err.code === 'failed-precondition') {
              console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time');
            } else if (err.code === 'unimplemented') {
              console.warn('⚠️ The current browser does not support all of the features required for Firestore persistence');
            } else {
              console.warn('⚠️ Error enabling Firestore persistence:', err);
            }
          });
      } catch (e) {
        console.warn('⚠️ Could not enable Firestore persistence:', e);
      }
      
      // Check if we should use emulators
      const useEmulators = process.env.NODE_ENV === 'development' && 
                        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
      
      if (useEmulators) {
        try {
          console.log('🔌 Connecting to Firestore emulator...');
          connectFirestoreEmulator(firestore, 'localhost', 8080);
          console.log('✅ Connected to Firestore emulator');
        } catch (err) {
          console.warn('⚠️ Failed to connect to Firestore emulator:', err);
        }
      } else {
        console.log('🌐 Using production Firebase Firestore');
      }
      
      console.log('✅ Firebase Firestore initialized successfully');
    } catch (error: unknown) {
      console.error('❌ Error initializing Firebase Firestore:', error);
      
      if (error && typeof error === 'object') {
        const firebaseError = error as { code?: string; message: string };
        throw new Error(`Failed to initialize Firebase Firestore: ${firebaseError.message || 'Unknown error'}`);
      }
      
      throw new Error('Failed to initialize Firebase Firestore: Unknown error occurred');
    }
  } else {
    console.log('♻️ Using existing Firebase Firestore instance');
  }
  
  return firestore as Firestore;
}

/**
 * Gets the Firebase Storage instance, initializing app if necessary
 */
export async function getFirebaseStorage() {
  if (typeof window === 'undefined') {
    return {} as any;
  }

  if (!firebaseStorageInstance) {
    const { getStorage } = await import('firebase/storage');
    const app = await getFirebaseApp();
    firebaseStorageInstance = getStorage(app);
    console.log('✅ Firebase Storage initialized');
  }

  return firebaseStorageInstance;
}

/**
 * Initialize Firebase with all services
 * Returns a promise that resolves when initialization is complete
 */
export async function initializeFirebase(): Promise<boolean> {
  // Skip initialization on server-side
  if (typeof window === 'undefined') return false;
  
  // Return existing promise if already initializing
  if (isInitialized) return Promise.resolve(true);
  if (initPromise) return initPromise;
  
  const currentPromise = connectionPromise;
  if (currentPromise) return currentPromise;
  
  // Create new initialization promise
  connectionPromise = new Promise<boolean>(async (resolve) => {
    try {
      const isConfigValid = validateFirebaseConfig();
      if (!isConfigValid) {
        throw new Error('Firebase configuration is incomplete. Check your environment variables.');
      }
      
      // Initialize app and services in parallel where possible
      const app = await getFirebaseApp();
      
      // Auth and Database can initialize in parallel
      await Promise.all([
        getFirebaseAuth(),
        getFirebaseDatabase(),
      ]);
      
      isInitialized = true;
      logDebug('✅ Firebase initialization completed');
      resolve(true);
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      resolve(false);
    }
  });
  
  return connectionPromise;
}

/**
 * Test database connection
 */
const testDatabaseConnection = async (): Promise<boolean> => {
  if (!firebaseDb) return false;
  
  try {
    // Simple test query with timeout
    const testRef = ref(firebaseDb, '.info/connected');
    const snapshot = await Promise.race([
      get(testRef),
      new Promise<DataSnapshot>((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT)
      )
    ]);
    
    return snapshot.val() === true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

/**
 * Get Firebase Auth instance
 */
export const getAuthInstance = (): Auth => {
  if (!firebaseAuth) {
    throw new Error('Firebase Auth not initialized. Call initializeFirebase() first.');
  }
  return firebaseAuth;
};

/**
 * Get Firebase Database instance
 */
export const getDatabaseInstance = (): Database => {
  if (!firebaseDb) {
    throw new Error('Firebase Database not initialized. Call initializeFirebase() first.');
  }
  return firebaseDb;
};

/**
 * Check if Firebase is ready
 */
export const isFirebaseReady = (): boolean => isInitialized;

/**
 * Wait for Firebase to be ready
 */
export const waitForFirebase = async (): Promise<boolean> => {
  if (isInitialized) return true;
  if (connectionPromise) return connectionPromise;
  return initializeFirebase();
};

/**
 * Wait for Firebase Auth to have a real authenticated user.
 * On PWA cold starts, Firebase restores the auth session asynchronously.
 * Database security rules require authentication, so queries will fail
 * if called before the auth session is restored.
 * 
 * Strategy:
 * 1. Wait for auth.authStateReady() (Firebase's built-in wait)
 * 2. If auth has user, return true
 * 3. If no user, wait briefly for onAuthStateChanged
 * 4. If still no user, attempt refresh token recovery
 * 
 * @param timeoutMs Maximum time to wait (default 15 seconds)
 * @returns true if auth user is available, false if timed out
 */
export const waitForAuthUser = async (timeoutMs = 15000): Promise<boolean> => {
  // Ensure Firebase is initialized first
  await waitForFirebase();
  
  const authInstance = await getFirebaseAuth();
  
  // Already have a user
  if (authInstance.currentUser) {
    console.log('✅ Auth user already available:', authInstance.currentUser.email);
    return true;
  }
  
  console.log('⏳ Waiting for Firebase Auth to restore session...');
  
  // Step 1: Wait for Firebase's built-in auth state resolution
  try {
    await Promise.race([
      authInstance.authStateReady(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('authStateReady timeout')), 5000))
    ]);
  } catch (e) {
    console.warn('⚠️ authStateReady timed out or failed');
  }
  
  if (authInstance.currentUser) {
    console.log('✅ Auth restored after authStateReady:', (authInstance.currentUser as any)?.email);
    return true;
  }
  
  // Step 2: Wait briefly for onAuthStateChanged
  const authRestoredViaListener = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, 3000);
    
    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      if (user) {
        console.log('✅ Auth session restored via listener:', user.email);
        clearTimeout(timeout);
        unsubscribe();
        resolve(true);
      }
    });
  });
  
  if (authRestoredViaListener) return true;
  
  // Step 3: Try refresh token recovery as last resort
  console.log('🔄 Attempting refresh token recovery via custom token...');
  const recovered = await attemptRefreshTokenRecovery(authInstance);
  if (recovered) {
    console.log('✅ Session recovered via custom token');
    return true;
  }
  
  console.warn('❌ Could not restore auth session');
  return false;
};

/**
 * Attempts to recover a user session using stored refresh token.
 * Calls the server-side /api/auth/refresh endpoint which:
 * 1. Validates the refresh token via Firebase REST API
 * 2. Creates a custom token using Firebase Admin SDK
 * 3. Returns the custom token so we can call signInWithCustomToken()
 * 
 * This fully restores the Firebase Auth session without any page reload.
 */
async function attemptRefreshTokenRecovery(authInstance: Auth): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  const backupAuthKey = 'firebase:authBackup';
  const authBackup = localStorage.getItem(backupAuthKey);
  
  if (!authBackup) {
    console.log('No auth backup found for recovery');
    return false;
  }
  
  try {
    const parsed = JSON.parse(authBackup);
    const { refreshToken, lastLogin } = parsed;
    const email = parsed.email || 'unknown';
    
    // Only attempt recovery for recent logins (within last 30 days)
    if (Date.now() - lastLogin > 30 * 24 * 60 * 60 * 1000) {
      console.log('Auth backup is too old, skipping recovery');
      localStorage.removeItem(backupAuthKey);
      return false;
    }
    
    if (!refreshToken) {
      console.log('Auth backup missing refresh token');
      return false;
    }
    
    console.log('🔄 Requesting custom token for session recovery...', email);
    
    // Call our server endpoint to exchange refresh token for custom token
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('❌ Session recovery request failed:', response.status, errData.message);
      if (response.status === 401) {
        // Token is invalid/expired - clear backup
        localStorage.removeItem(backupAuthKey);
      }
      return false;
    }
    
    const data = await response.json();
    
    if (!data.success || !data.customToken) {
      console.warn('❌ Server did not return custom token');
      return false;
    }
    
    console.log('✅ Got custom token, signing in...');
    
    // Sign in with the custom token - this fully restores the Firebase Auth session
    await signInWithCustomToken(authInstance, data.customToken);
    
    // Update the backup with the new refresh token
    if (data.refreshToken) {
      localStorage.setItem(backupAuthKey, JSON.stringify({
        uid: data.uid,
        email,
        refreshToken: data.refreshToken,
        lastLogin: Date.now()
      }));
    }
    
    console.log('✅ Session fully restored via custom token for:', email);
    return true;
    
  } catch (error) {
    console.error('Error during refresh token recovery:', error);
    return false;
  }
}

// Preload and optimize Firebase initialization
if (typeof window !== 'undefined' && !isInitialized) {
  // Aggressively start initialization as early as possible
  connectionPromise = initializeFirebase()
    .then((result) => {
      // Pre-warm the auth state listener for faster subsequent loads
      if (result && auth) {
        // Set up auth state listener early
        const unsubscribe = auth.onAuthStateChanged(() => {});
        // Clean up after a brief moment to avoid memory leaks
        setTimeout(() => unsubscribe(), 100);
      }
      return result;
    })
    .then(success => {
      isInitialized = success;
      if (success) {
        console.log('Firebase initialized successfully');
      } else {
        console.error('Firebase initialization failed');
      }
      return success;
    })
    .catch(error => {
      console.error('Firebase initialization error:', error);
      isInitialized = false;
      return false;
    });
}

// Export initialized instances
export { firebaseApp, firebaseAuth, firebaseDb };

// Firestore instance - lazily initialized on first use, NOT at module load
export let db: Firestore;

// Lazy Firestore getter - only initializes when actually needed
export async function getFirestoreDb(): Promise<Firestore> {
  if (!db) {
    db = await getFirebaseFirestore();
  }
  return db;
}

// Export database helpers
export { ref, onValue, get, update };

// Export types
export type { 
  FirebaseAppType as FirebaseApp, 
  AuthType as Auth, 
  DatabaseType as Database,
  DataSnapshot 
};
