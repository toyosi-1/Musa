/**
 * Firebase Admin SDK for server-side API routes.
 * The client SDK's getFirebaseDatabase() returns an empty stub on the server,
 * so API routes must use this admin helper instead.
 */
import { initializeApp, getApps, cert, App, applicationDefault } from 'firebase-admin/app';
import { getDatabase, Database } from 'firebase-admin/database';

let adminApp: App | null = null;
let initError: Error | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (initError) throw initError;

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    initError = new Error('NEXT_PUBLIC_FIREBASE_DATABASE_URL environment variable is not set');
    throw initError;
  }

  try {
    // Try service account JSON from env first
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      try {
        const parsed = JSON.parse(serviceAccountKey);
        adminApp = initializeApp({
          credential: cert(parsed),
          databaseURL,
        });
        console.log('✅ Firebase Admin initialized with service account');
        return adminApp;
      } catch (parseError) {
        console.warn('⚠️ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, trying default credentials');
      }
    }

    // Fall back to application default credentials (works on GCP, Cloud Functions, etc.)
    try {
      adminApp = initializeApp({
        credential: applicationDefault(),
        databaseURL,
      });
      console.log('✅ Firebase Admin initialized with application default credentials');
      return adminApp;
    } catch (defaultError) {
      // Last resort: initialize without credentials (will fail on most operations but won't crash)
      console.warn('⚠️ No credentials available, initializing Firebase Admin without auth');
      adminApp = initializeApp({ databaseURL });
      return adminApp;
    }
  } catch (error) {
    initError = error instanceof Error ? error : new Error('Failed to initialize Firebase Admin');
    console.error('❌ Firebase Admin initialization failed:', initError);
    throw initError;
  }
}

/**
 * Returns a Firebase Admin Realtime Database instance.
 * Safe to call from any server-side context (API routes, middleware, etc.)
 * @throws {Error} if Firebase Admin cannot be initialized
 */
export function getAdminDatabase(): Database {
  try {
    const app = getAdminApp();
    return getDatabase(app);
  } catch (error) {
    console.error('❌ Failed to get admin database:', error);
    throw error;
  }
}

/**
 * Check if Firebase Admin is properly configured
 */
export function isAdminConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL &&
    (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS)
  );
}
