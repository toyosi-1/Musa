import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  databaseURL: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
};

export async function testFirebaseConnection(config: FirebaseConfig): Promise<{
  success: boolean;
  services: {
    app: boolean;
    auth: boolean;
    database: boolean;
  };
  error?: string;
  details?: any;
}> {
  console.log('🚀 Starting Firebase connection test...');
  
  try {
    // 1. Test Firebase App Initialization
    console.log('🔍 Testing Firebase App initialization...');
    let app: FirebaseApp;
    try {
      app = initializeApp(config, 'test-connection');
      console.log('✅ Firebase App initialized successfully');
    } catch (appError) {
      console.error('❌ Failed to initialize Firebase App:', appError);
      return {
        success: false,
        services: { app: false, auth: false, database: false },
        error: 'Failed to initialize Firebase App',
        details: appError instanceof Error ? appError.message : String(appError)
      };
    }

    // 2. Test Auth Service
    console.log('🔍 Testing Firebase Auth service...');
    let authInitialized = false;
    try {
      const auth = getAuth(app);
      if (process.env.NODE_ENV === 'development') {
        try {
          connectAuthEmulator(auth, 'http://localhost:9099');
          console.log('🔌 Connected to Auth Emulator');
        } catch (emulatorError) {
          console.warn('⚠️ Could not connect to Auth Emulator, using production', emulatorError);
        }
      }
      authInitialized = true;
      console.log('✅ Firebase Auth initialized successfully');
    } catch (authError) {
      console.error('❌ Failed to initialize Firebase Auth:', authError);
      return {
        success: false,
        services: { app: true, auth: false, database: false },
        error: 'Failed to initialize Firebase Auth',
        details: authError instanceof Error ? authError.message : String(authError)
      };
    }

    // 3. Test Database Service
    console.log('🔍 Testing Firebase Database service...');
    let dbInitialized = false;
    try {
      const db = getDatabase(app);
      if (process.env.NODE_ENV === 'development') {
        try {
          connectDatabaseEmulator(db, 'localhost', 9000);
          console.log('🔌 Connected to Database Emulator');
        } catch (emulatorError) {
          console.warn('⚠️ Could not connect to Database Emulator, using production', emulatorError);
        }
      }
      dbInitialized = true;
      console.log('✅ Firebase Database initialized successfully');
    } catch (dbError) {
      console.error('❌ Failed to initialize Firebase Database:', dbError);
      return {
        success: false,
        services: { app: true, auth: authInitialized, database: false },
        error: 'Failed to initialize Firebase Database',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      };
    }

    // 4. Clean up test app
    try {
      // Use deleteApp from firebase/app to properly clean up
      const { deleteApp } = await import('firebase/app');
      await deleteApp(app);
      console.log('🧹 Cleaned up test Firebase app');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to clean up test Firebase app:', cleanupError);
    }

    return {
      success: true,
      services: {
        app: true,
        auth: authInitialized,
        database: dbInitialized
      }
    };
  } catch (error) {
    console.error('❌ Unexpected error during Firebase connection test:', error);
    return {
      success: false,
      services: { app: false, auth: false, database: false },
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

// Helper function to get Firebase config from environment variables
export function getFirebaseConfigFromEnv(): FirebaseConfig | null {
  const config: Partial<FirebaseConfig> = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  // Check for required fields
  const requiredFields: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    console.error('❌ Missing required Firebase config fields:', missingFields);
    return null;
  }

  return config as FirebaseConfig;
}
