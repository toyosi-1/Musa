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

// Your web app's Firebase configuration from environment variables
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
    try {
      // Dynamically import Firebase Database modules
      const { getDatabase, connectDatabaseEmulator } = await import('firebase/database');
      const app = await getFirebaseApp();
      
      firebaseDb = getDatabase(app);
      
      // Set shorter timeouts for Firebase operations
      try {
        (firebaseDb as any).app.options.databaseTimeoutSeconds = 10; // 10 seconds timeout
      } catch (e) {
        console.warn('Could not set database timeout:', e);
      }
      
      // Connect to emulators in development
      if (process.env.NODE_ENV === 'development' && 
          process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
        try {
          connectDatabaseEmulator(firebaseDb, 'localhost', 9000);
          console.log('Connected to Database emulator');
        } catch (err) {
          console.warn('Failed to connect to Database emulator:', err);
        }
      }
    } catch (error) {
      console.error('Error initializing Firebase Database:', error);
      throw new Error('Failed to initialize Firebase Database');
    }
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
          const { ref, onValue } = await import('firebase/database');
          
          const connectionPromise = new Promise<void>((connResolve) => {
            try {
              const connectedRef = ref(database, '.info/connected');
              const unsubscribe = onValue(connectedRef, (snapshot: any) => {
                if (snapshot.val() === true) {
                  console.log('Connected to Firebase Realtime Database');
                  unsubscribe();
                  isInitialized = true;
                  connResolve();
                }
              });
              
              // Add listener for database connection failures
              window.addEventListener('offline', () => {
                console.warn('Device went offline');
              });
            } catch (e) {
              console.warn('Error checking database connection:', e);
              connResolve(); // Resolve anyway to not block initialization
            }
          });
          
          // Race against timeout
          const timeoutPromise = new Promise<void>((connResolve) => {
            setTimeout(() => {
              console.warn('Database connection check timed out');
              connResolve();
            }, 3000); // Use a shorter timeout here (3s)
          });
          
          // Wait for either connection or timeout
          await Promise.race([connectionPromise, timeoutPromise]);
        } catch (error) {
          console.warn('Database connection check failed:', error);
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
