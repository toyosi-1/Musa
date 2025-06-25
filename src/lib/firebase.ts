// Use dynamic imports for Firebase to prevent SSR issues
// This ensures Firebase only loads in the browser environment

// Flag to prevent double initialization
let isInitialized = false;

// Types for Firebase services
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Database } from 'firebase/database';

// Empty stubs for server-side rendering
let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;
let firebaseDb: Database | undefined;

// Get Firebase config from environment variables
// This works in both server and client contexts with Next.js
const getFirebaseConfig = () => {
  // In the browser, we can access the env variables directly from the window object
  if (typeof window !== 'undefined') {
    return {
      apiKey: window.ENV?.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: window.ENV?.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: window.ENV?.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: window.ENV?.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: window.ENV?.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: window.ENV?.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: window.ENV?.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      databaseURL: window.ENV?.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    };
  }
  
  // Server-side fallback
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  };
};

const firebaseConfig = getFirebaseConfig();

// Function to validate Firebase config
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

// Performance monitoring helper
const timeStart = (label: string) => {
  console.time(`⏱️ ${label}`);
  return () => console.timeEnd(`⏱️ ${label}`);
};

// Lazy initialization variables with proper typing
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let rtdb: Database | undefined;
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
  // Return empty stub in server context
  if (typeof window === 'undefined') {
    console.log('Server context detected, returning empty Auth stub');
    return {} as Auth;
  }
  
  if (!firebaseAuth) {
    try {
      // Dynamically import Firebase Auth modules
      const { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } = await import('firebase/auth');
      const app = await getFirebaseApp();
      
      firebaseAuth = getAuth(app);
      
      // Set persistence - wrapped in try/catch to avoid blocking errors
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);
      } catch (error: any) {
        console.warn('Failed to set persistence:', error);
      }
      
      // Connect to emulators in development
      if (process.env.NODE_ENV === 'development' && 
          process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
        try {
          connectAuthEmulator(firebaseAuth, 'http://localhost:9099', { disableWarnings: true });
          console.log('Connected to Auth emulator');
        } catch (err) {
          console.warn('Failed to connect to Auth emulator:', err);
        }
      }
    } catch (error) {
      console.error('Error initializing Firebase Auth:', error);
      throw new Error('Failed to initialize Firebase Auth');
    }
  }
  
  return firebaseAuth as Auth;
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
        (firebaseDb as any).app.options.databaseTimeoutSeconds = 10; // 10 seconds timeout
        console.log('⏱️ Set database operation timeout to 10 seconds');
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
 * Initialize Firebase with all services
 * Returns a promise that resolves when initialization is complete
 */
export async function initializeFirebase(): Promise<boolean> {
  // Skip initialization on server-side
  if (typeof window === 'undefined') {
    console.log('Skipping Firebase initialization on server');
    return false;
  }
  
  // Return existing promise if already initializing
  if (isInitialized || initPromise) {
    console.log('🔥 Firebase already initialized or initializing, returning existing promise');
    return initPromise || Promise.resolve(isInitialized);
  }
  
  console.log('🔥 Starting Firebase initialization process...');
  
  initPromise = new Promise<boolean>(async (resolve) => {
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
      console.log('🔥 Getting Firebase app...');
      const app = await getFirebaseApp();
      console.log('✅ Firebase app initialized');
      
      console.log('🔥 Getting Firebase auth...');
      const auth = await getFirebaseAuth();
      console.log('✅ Firebase auth initialized');
      
      console.log('🔥 Getting Firebase database...');
      const database = await getFirebaseDatabase();
      console.log('✅ Firebase database initialized');
      
      // Test database connection with timeout
      if (typeof window !== 'undefined') {
        try {
          // Dynamic import for database operations
          const { ref, onValue, get, set } = await import('firebase/database');
          
          // First, try to connect to the database
          const connectionPromise = new Promise<void>(async (connResolve, connReject) => {
            try {
              // Test connection to the database
              const testRef = ref(database, 'connection_test');
              
              // Try to write and read a test value
              await set(testRef, { timestamp: Date.now() });
              const snapshot = await get(testRef);
              
              if (snapshot.exists()) {
                console.log('✅ Successfully connected to Firebase Realtime Database');
                await set(testRef, null); // Clean up
                isInitialized = true;
                connResolve();
              } else {
                console.warn('Database connection test failed: No data returned');
                connResolve(); // Still resolve to not block initialization
              }
            } catch (e) {
              console.error('❌ Database connection test failed:', e);
              connResolve(); // Still resolve to not block initialization
            }
          });
          
          // Also set up the connection state listener for real-time updates
          const connectedRef = ref(database, '.info/connected');
          const connectionStateUnsubscribe = onValue(connectedRef, (snapshot) => {
            console.log(snapshot.val() ? '📡 Connected to database' : '❌ Disconnected from database');
          });
          
          // Race against timeout
          const timeoutPromise = new Promise<void>((connResolve) => {
            setTimeout(() => {
              console.warn('⚠️ Database connection check timed out after 5 seconds');
              connResolve();
            }, 5000);
          });
          
          // Wait for either connection or timeout
          await Promise.race([connectionPromise, timeoutPromise]);
          
          // Clean up the connection state listener after a delay
          setTimeout(() => {
            try {
              connectionStateUnsubscribe();
            } catch (e) {
              console.warn('Error cleaning up connection listener:', e);
            }
          }, 10000);
          
        } catch (error) {
          console.error('❌ Database connection check failed:', error);
          // Continue initialization anyway
        }
      }
      
      isInitialized = true;
      console.log('Firebase initialization completed');
      resolve(true);
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      resolve(false);
    }
  });
  
  return initPromise;
}

// Initialize Firebase lazily for client-side only
if (typeof window !== 'undefined') {
  // Start initialization in the background but don't wait
  setTimeout(() => {
    initializeFirebase().then((success) => {
      console.log(`Firebase background initialization ${success ? 'complete' : 'failed'}`);
    });
  }, 100); // Small delay to let the page render first
}

// Export helper to check if Firebase is ready
export const isFirebaseReady = () => isInitialized;

// Export the initialization promise
export const firebaseInitComplete = () => initPromise || Promise.resolve(false);
