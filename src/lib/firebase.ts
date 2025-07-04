// Core Firebase services
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth, User } from 'firebase/auth';
import { 
  getDatabase, 
  connectDatabaseEmulator, 
  Database, 
  ref, 
  onValue, 
  get,
  DataSnapshot,
  onDisconnect,
  set,
  serverTimestamp,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  off,
  QueryConstraint
} from 'firebase/database';

// Types
type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  databaseURL: string;
};

// Firebase configuration from environment variables
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || ''
};

// Global state
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Database | null = null;
let isInitialized = false;
let isInitializing = false;
let initializationError: Error | null = null;

// Export types
export type { FirebaseApp, Auth, User, Database, DataSnapshot };

declare global {
  interface Window {
    ENV: {
      NEXT_PUBLIC_FIREBASE_API_KEY?: string;
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
      NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
      NEXT_PUBLIC_FIREBASE_DATABASE_URL?: string;
      NEXT_PUBLIC_USE_FIREBASE_EMULATORS?: string;
    };
  }
}

// Connection test timeout (in ms)
const CONNECTION_TIMEOUT = 10000; // 10 seconds

/**
 * Validates the Firebase configuration
 * @throws {Error} If required configuration is missing
 */
const validateFirebaseConfig = (): void => {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'databaseURL'
  ] as const;

  const missingFields = requiredFields.filter(
    field => !firebaseConfig[field]
  );

  if (missingFields.length > 0) {
    const errorMsg = `Missing required Firebase configuration: ${missingFields.join(', ')}`;
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  console.log('✅ Firebase configuration is valid');
};

/**
 * Initializes the Firebase app
 */
const initializeFirebaseApp = (): FirebaseApp => {
  if (firebaseApp) {
    console.log('♻️ Using existing Firebase App instance');
    return firebaseApp;
  }

  console.log('🔥 Initializing Firebase App...');
  validateFirebaseConfig();

  try {
    // Initialize Firebase
    firebaseApp = initializeApp(firebaseConfig);
    console.log('✅ Firebase App initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Error initializing Firebase App:', error);
    throw error;
  }
};

/**
 * Initializes Firebase Auth
 */
const initializeAuth = (app: FirebaseApp): Auth => {
  if (firebaseAuth) {
    console.log('♻️ Using existing Firebase Auth instance');
    return firebaseAuth;
  }

  console.log('🔑 Initializing Firebase Auth...');
  
  try {
    // Initialize Firebase Auth
    firebaseAuth = getAuth(app);
    
    // Connect to emulator in development if enabled
    if (process.env.NODE_ENV === 'development' && 
        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
      console.log('🔌 Connecting to Auth emulator...');
      connectAuthEmulator(firebaseAuth, 'http://localhost:9099');
      console.log('✅ Connected to Auth emulator');
    }
    
    console.log('✅ Firebase Auth initialized successfully');
    return firebaseAuth;
  } catch (error) {
    console.error('❌ Error initializing Firebase Auth:', error);
    throw error;
  }
};

/**
 * Initializes Firebase Realtime Database
 */
const initializeDatabase = (app: FirebaseApp): Database => {
  if (firebaseDb) {
    console.log('♻️ Using existing Firebase Database instance');
    return firebaseDb;
  }

  console.log('💾 Initializing Firebase Database...');
  
  try {
    // Initialize Firebase Database
    firebaseDb = getDatabase(app);
    
    // Set up connection monitoring
    const connectedRef = ref(firebaseDb, '.info/connected');
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        console.log('✅ Connected to Firebase Database');
      } else {
        console.log('❌ Disconnected from Firebase Database');
      }
    });
    
    // Connect to emulator in development if enabled
    if (process.env.NODE_ENV === 'development' && 
        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
      console.log('🔌 Connecting to Database emulator...');
      connectDatabaseEmulator(firebaseDb, 'localhost', 9000);
      console.log('✅ Connected to Database emulator');
    }
    
    console.log('✅ Firebase Database initialized successfully');
    return firebaseDb;
  } catch (error) {
    console.error('❌ Error initializing Firebase Database:', error);
    throw error;
  }
};

/**
 * Initializes all Firebase services
 */
export const initializeFirebase = async (): Promise<{
  app: FirebaseApp;
  auth: Auth;
  db: Database;
}> => {
  // Skip if already initialized
  if (isInitialized && firebaseApp && firebaseAuth && firebaseDb) {
    console.log('♻️ Firebase already initialized');
    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
  }

  // Prevent multiple initializations
  if (isInitializing) {
    console.log('⏳ Firebase initialization already in progress');
    throw new Error('Firebase initialization already in progress');
  }

  isInitializing = true;
  console.log('🚀 Initializing Firebase...');
  
  try {
    // Initialize Firebase services
    const app = initializeFirebaseApp();
    const auth = initializeAuth(app);
    const db = initializeDatabase(app);
    
    // Update state
    isInitialized = true;
    isInitializing = false;
    
    console.log('🎉 Firebase initialized successfully');
    return { app, auth, db };
  } catch (error) {
    isInitializing = false;
    initializationError = error as Error;
    console.error('🔥 Failed to initialize Firebase:', error);
    throw error;
  }
};

/**
 * Gets the Firebase App instance
 */
export const getFirebaseApp = (): FirebaseApp => {
  if (!firebaseApp) {
    throw new Error('Firebase App not initialized. Call initializeFirebase() first.');
  }
  return firebaseApp;
};

/**
 * Gets the Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth => {
  if (!firebaseAuth) {
    throw new Error('Firebase Auth not initialized. Call initializeFirebase() first.');
  }
  return firebaseAuth;
};

/**
 * Gets the Firebase Database instance
 */
export const getFirebaseDatabase = (): Database => {
  if (!firebaseDb) {
    throw new Error('Firebase Database not initialized. Call initializeFirebase() first.');
  }
  return firebaseDb;
};

/**
 * Checks if Firebase is initialized
 */
export const isFirebaseReady = (): boolean => {
  return isInitialized && !!firebaseApp && !!firebaseAuth && !!firebaseDb;
};

/**
 * Waits for Firebase to be ready
 */
export const waitForFirebase = async (timeout = 10000): Promise<boolean> => {
  if (isFirebaseReady()) {
    return true;
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkReady = () => {
      if (isFirebaseReady()) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error('Firebase initialization timed out'));
        return;
      }
      
      if (initializationError) {
        reject(initializationError);
        return;
      }
      
      setTimeout(checkReady, 100);
    };
    
    checkReady();
  });
};

// Initialize Firebase automatically in browser environment
if (typeof window !== 'undefined') {
  initializeFirebase().catch(error => {
    console.error('Failed to initialize Firebase automatically:', error);
  });
}

export {
  // Firebase SDK
  ref,
  get,
  set,
  query,
  onValue,
  off,
  onDisconnect,
  serverTimestamp,
  orderByChild,
  equalTo,
  limitToLast,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  
  // Types
  type QueryConstraint,
  type DataSnapshot,
  type User
};
