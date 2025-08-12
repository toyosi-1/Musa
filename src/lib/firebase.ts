import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator, 
  Auth, 
  setPersistence, 
  browserLocalPersistence, 
  indexedDBLocalPersistence,
  signInWithEmailAndPassword,
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
  goOffline
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

// Performance monitoring helpers
const timeStart = (label: string) => {
  if (typeof window !== 'undefined' && window.performance) {
    window.performance.mark(`${label}-start`);
  }
  console.time(`⏱️ ${label}`);
};

const timeEnd = (label: string) => {
  if (typeof window !== 'undefined' && window.performance) {
    window.performance.mark(`${label}-end`);
    try {
      window.performance.measure(label, `${label}-start`, `${label}-end`);
    } catch (e) {
      // Ignore measurement errors
    }
  }
  console.timeEnd(`⏱️ ${label}`);
};

// Lazy initialization variables with proper typing
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let rtdb: Database | undefined;
let firestore: Firestore | undefined;
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
  timeStart('getFirebaseAuth');
  
  // If already initialized, return it immediately
  if (auth) {
    timeEnd('getFirebaseAuth');
    return auth;
  }
  
  // Ensure the app is initialized first
  const app = await getFirebaseApp();
  
  // Initialize Auth with enhanced persistence for iOS PWA
  try {
    auth = getAuth(app);
    
    // Enhanced persistence configuration for all platforms
    const isPWA = typeof window !== 'undefined' && 
      (window.matchMedia('(display-mode: standalone)').matches || 
       (window.navigator as any).standalone === true);
    
    // Special handling for iOS PWA
    const isIOS = typeof navigator !== 'undefined' && 
                 /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                 !(window as any).MSStream;
    
    if (isPWA) {
      console.log('📱 PWA mode detected, setting enhanced auth persistence...');
      
      // For iOS PWA, we need a more robust persistence strategy
      if (isIOS) {
        console.log('🍎 iOS PWA detected - applying enhanced persistence strategy');
        try {
          // 1. First try IndexedDB (most reliable for PWA)
          await setPersistence(auth!, indexedDBLocalPersistence);
          console.log('✅ Auth persistence set to IndexedDB for iOS PWA');
          
          // 2. Add localStorage backup for critical auth state
          if (typeof window !== 'undefined') {
            const backupAuthKey = 'firebase:authBackup';
            
            // Listen for auth state changes to keep backup updated
            auth!.onAuthStateChanged((user) => {
              if (user) {
                // Store critical auth data in localStorage as backup
                const authData = {
                  uid: user.uid,
                  email: user.email,
                  refreshToken: user.refreshToken,
                  lastLogin: Date.now()
                };
                localStorage.setItem(backupAuthKey, JSON.stringify(authData));
              } else {
                localStorage.removeItem(backupAuthKey);
              }
            });
            
            // Check for backup on initialization
            const authBackup = localStorage.getItem(backupAuthKey);
            if (authBackup && !auth!.currentUser) {
              console.log('🔍 Found auth backup, attempting recovery...');
              // This will trigger the auth state change listener above
              await auth!.authStateReady();
            }
          }
          
        } catch (indexedDBError) {
          console.warn('⚠️ IndexedDB persistence failed, falling back to localStorage:', indexedDBError);
          try {
            await setPersistence(auth!, browserLocalPersistence);
            console.log('✅ Auth persistence set to localStorage for PWA');
          } catch (localStorageError) {
            console.error('❌ All persistence methods failed for PWA:', localStorageError);
            // Even if persistence fails, we can still try to recover the session
            if (typeof window !== 'undefined' && !auth!.currentUser) {
              await attemptSessionRecovery(auth!);
            }
          }
        }
      } else {
        // For non-iOS PWA, use standard persistence
        try {
          await setPersistence(auth!, indexedDBLocalPersistence);
          console.log('✅ Auth persistence set to IndexedDB for PWA');
        } catch (error) {
          console.warn('⚠️ IndexedDB persistence failed, falling back to localStorage:', error);
          await setPersistence(auth!, browserLocalPersistence);
          console.log('✅ Auth persistence set to localStorage for PWA');
        }
      }
    } else {
      // For non-PWA mode, use standard persistence
      try {
        await setPersistence(auth!, indexedDBLocalPersistence);
        console.log('✅ Auth persistence set to IndexedDB');
      } catch (error) {
        console.warn('⚠️ IndexedDB persistence failed, falling back to localStorage:', error);
        await setPersistence(auth!, browserLocalPersistence);
        console.log('✅ Auth persistence set to localStorage');
      }
    }
    
    // Connect to emulator in development (async)
    if (process.env.NODE_ENV === 'development' && 
        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      try {
        connectAuthEmulator(auth!, 'http://localhost:9099', { disableWarnings: true });
        console.log('🔧 Connected to Auth emulator');
      } catch (error) {
        console.warn('⚠️ Failed to connect to Auth emulator:', error);
      }
    }
    
    timeEnd('getFirebaseAuth');
    return auth;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Auth:', error);
    timeEnd('getFirebaseAuth');
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
    console.log('🔄 Initializing Firebase Database...');
    try {
      // Dynamically import Firebase Database modules
      const { getDatabase, connectDatabaseEmulator } = await import('firebase/database');
      const app = await getFirebaseApp();
      
      // Get database URL from environment variables
      const databaseURL = window.ENV?.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 
                         process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
      
      if (!databaseURL) {
        console.error('❌ Firebase Database URL is not configured');
        throw new Error('Firebase Database URL is not configured. Please check your environment variables.');
      }
      
      console.log(`🔗 Initializing database with URL: ${databaseURL}`);
      
      // Initialize database with explicit URL
      firebaseDb = getDatabase(app, databaseURL);
      
      // Set shorter timeouts for Firebase operations
      try {
        // Increase the default timeout for initial connection
        (firebaseDb as any).app.options.databaseTimeoutSeconds = 30; // 30 seconds timeout for initial connection
        console.log('⏱️ Set database operation timeout to 30 seconds');
        
        // Add offline support
        goOnline(firebaseDb);
        console.log('🌐 Enabled Firebase Database online mode');
        
        // Set up connection state monitoring
        const connectedRef = ref(firebaseDb, '.info/connected');
        onValue(connectedRef, (snap) => {
          if (snap.val() === true) {
            console.log('✅ Database connection established');
          } else {
            console.log('⚠️ Database connection lost');
          }
        });
      } catch (e) {
        console.warn('⚠️ Could not set database timeout:', e);
      }
      
      // Check if we should use emulators
      const useEmulators = process.env.NODE_ENV === 'development' && 
                         process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
      
      if (useEmulators) {
        try {
          console.log('🔌 Connecting to Database emulator...');
          connectDatabaseEmulator(firebaseDb, 'localhost', 9000);
          console.log('✅ Connected to Database emulator');
        } catch (err) {
          console.warn('⚠️ Failed to connect to Database emulator:', err);
        }
      } else {
        console.log('🌐 Using production Firebase Database');
      }
      
      console.log('✅ Firebase Database initialized successfully');
    } catch (error: unknown) {
      console.error('❌ Error initializing Firebase Database:', error);
      
      // Provide more detailed error information
      if (error && typeof error === 'object') {
        const firebaseError = error as { code?: string; message: string };
        
        if (firebaseError.code) {
          console.error(`Firebase error code: ${firebaseError.code}`);
          console.error(`Firebase error message: ${firebaseError.message}`);
          
          if (firebaseError.code === 'app/duplicate-app') {
            console.error('A Firebase App named "[DEFAULT]" already exists');
          } else if (firebaseError.code === 'app/no-app') {
            console.error('No Firebase App has been created');
          } else if (firebaseError.code === 'storage/unknown') {
            console.error('Unknown error occurred while accessing storage');
          }
        }
        
        throw new Error(`Failed to initialize Firebase Database: ${firebaseError.message || 'Unknown error'}`);
      }
      
      throw new Error('Failed to initialize Firebase Database: Unknown error occurred');
    }
  } else {
    console.log('♻️ Using existing Firebase Database instance');
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
 * Initialize Firebase with all services
 * Returns a promise that resolves when initialization is complete
 */
export async function initializeFirebase(): Promise<boolean> {
  console.log('=== Starting Firebase Initialization ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Is Server:', typeof window === 'undefined');
  console.log('=== Firebase Config ===');
  console.log('API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '*** (set)' : 'Not set');
  console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'Not set');
  console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not set');
  console.log('Database URL:', process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'Not set');
  console.log('========================');
  // Skip initialization on server-side
  if (typeof window === 'undefined') {
    console.log('⚠️ Skipping Firebase initialization on server side');
    return false;
  }
  
  // Return existing promise if already initializing
  if (isInitialized) {
    console.log('✅ Firebase already initialized');
    return Promise.resolve(true);
  }
  
  if (initPromise) {
    console.log('⏳ Firebase initialization in progress, returning existing promise');
    return initPromise;
  }
  
  console.log('🔥 Starting Firebase initialization process...');
  
  // Store the current promise to prevent multiple initializations
  const currentPromise = connectionPromise;
  if (currentPromise) return currentPromise;
  
  // Create new initialization promise
  connectionPromise = new Promise<boolean>(async (resolve) => {
    try {
      console.log('🔥 Starting Firebase initialization...');
      
      // Check configuration
      console.log('🔥 Validating Firebase configuration...');
      const isConfigValid = validateFirebaseConfig();
      if (!isConfigValid) {
        console.error('❌ Firebase configuration validation failed');
        throw new Error('Firebase configuration is incomplete. Check your environment variables.');
      }
      console.log('✅ Firebase configuration is valid');
      
      // Initialize app and services
      console.log('🔥 [1/3] Initializing Firebase App...');
      const app = await getFirebaseApp();
      console.log('✅ [1/3] Firebase App initialized successfully');
      
      console.log('🔥 [2/3] Initializing Firebase Auth...');
      const auth = await getFirebaseAuth();
      console.log('✅ [2/3] Firebase Auth initialized successfully');
      
      console.log('🔥 [3/3] Initializing Firebase Database...');
      const database = await getFirebaseDatabase();
      console.log('✅ [3/3] Firebase Database initialized successfully');
      
      // Log auth state
      if (auth) {
        console.log('🔐 Auth state:', auth.currentUser ? 'User signed in' : 'No user signed in');
      }
      
      // Skip database connection test for faster initialization
      // The auth will work even if DB test fails
      console.log('✅ Database initialized, skipping connection test for speed');
      
      isInitialized = true;
      console.log('Firebase initialization completed');
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
 * Attempts to recover a user session when standard persistence fails
 * This is a last-resort mechanism for iOS PWA where IndexedDB might be cleared
 */
async function attemptSessionRecovery(auth: Auth): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const backupAuthKey = 'firebase:authBackup';
  const authBackup = localStorage.getItem(backupAuthKey);
  
  if (!authBackup) {
    console.log('No auth backup found for recovery');
    return;
  }
  
  try {
    const { email, refreshToken, lastLogin } = JSON.parse(authBackup);
    
    // Only attempt recovery for recent logins (within last 7 days)
    if (Date.now() - lastLogin > 7 * 24 * 60 * 60 * 1000) {
      console.log('Auth backup is too old, skipping recovery');
      localStorage.removeItem(backupAuthKey);
      return;
    }
    
    console.log('Attempting to recover session from backup...');
    
    // In a real implementation, you would need to:
    // 1. Verify the refresh token is still valid
    // 2. Exchange the refresh token for a new ID token
    // 3. Sign in the user with the new credentials
    
    // For now, we'll just clear the backup to prevent repeated failed attempts
    // A full implementation would require a backend endpoint to securely handle token refresh
    console.warn('Session recovery requires backend implementation');
    
  } catch (error) {
    console.error('Error during session recovery:', error);
    // Clear invalid backup data
    localStorage.removeItem(backupAuthKey);
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

// Export Firestore instance
export let db: Firestore;

// Initialize Firestore if we're on the client side
if (typeof window !== 'undefined') {
  getFirebaseFirestore()
    .then(firestoreInstance => {
      db = firestoreInstance;
      console.log('✅ Firestore instance exported as db');
    })
    .catch(error => {
      console.error('❌ Failed to initialize Firestore for export:', error);
    });
}

// Export database helpers
export { ref, onValue, get };

// Export types
export type { 
  FirebaseAppType as FirebaseApp, 
  AuthType as Auth, 
  DatabaseType as Database,
  DataSnapshot 
};
