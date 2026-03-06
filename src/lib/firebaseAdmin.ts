/**
 * Firebase Admin SDK for server-side API routes.
 * The client SDK's getFirebaseDatabase() returns an empty stub on the server,
 * so API routes must use this admin helper instead.
 */
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getDatabase, Database } from 'firebase-admin/database';

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    throw new Error('NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set');
  }

  // Try service account JSON from env, fall back to application default credentials
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    try {
      const parsed = JSON.parse(serviceAccount);
      adminApp = initializeApp({
        credential: cert(parsed),
        databaseURL,
      });
      return adminApp;
    } catch {
      // fall through to default init
    }
  }

  // Initialize with just the database URL (works when running on GCP or with GOOGLE_APPLICATION_CREDENTIALS)
  adminApp = initializeApp({ databaseURL });
  return adminApp;
}

/**
 * Returns a Firebase Admin Realtime Database instance.
 * Safe to call from any server-side context (API routes, middleware, etc.)
 */
export function getAdminDatabase(): Database {
  const app = getAdminApp();
  return getDatabase(app);
}
